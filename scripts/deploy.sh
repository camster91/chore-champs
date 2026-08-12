#!/usr/bin/env bash
# scripts/deploy.sh — chore-champs production deploy
#
# Runs on the hostinger SSH alias as root, from /root/chore-champs/.
# Idempotent: safe to re-run. Refuses if not on hostinger.
#
# What it does (in order):
#   1. Sanity check (root + /root/chore-champs + docker reachable + .env exists)
#   2. git pull --ff-only origin master
#   3. docker build -t chore-champs:latest . (skipped with --skip-build)
#   4. prisma migrate deploy (against the running postgres)
#   5. Write Traefik labels to /tmp/chore-traefik.labels via printf
#      (DO NOT inline backticks — they get shell-eaten. See
#      ~/.hermes/skills/devops/traefik-label-deploy-via-ssh/SKILL.md)
#   6. Tag previous image as chore-champs:previous (rollback target)
#      docker rm -f kids-chore-app && docker run -d with --label-file
#   7. Health-check loop: poll https://chores.ashbi.ca/api/health for HTTP 200
#
# Usage:
#   bash scripts/deploy.sh                 # full deploy
#   bash scripts/deploy.sh --skip-build    # only restart container
#   bash scripts/deploy.sh --dry-run       # print what would happen, do nothing
#   bash scripts/deploy.sh --rollback      # restart with chore-champs:previous
#
# Exit codes:
#   0   success
#   1   sanity check failed
#   2   git pull failed
#   3   docker build failed
#   4   prisma migrate deploy failed
#   5   container start failed
#   6   health check failed (rollback hint printed)

set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────────────────────

REPO_DIR="/root/chore-champs"
IMAGE_NAME="chore-champs:latest"
ROLLBACK_IMAGE="chore-champs:previous"
CONTAINER_NAME="kids-chore-app"
HEALTH_URL="https://chores.ashbi.ca/api/health"
LABELS_FILE="/tmp/chore-traefik.labels"
ENV_FILE="/root/chore-champs/.env.production"

# Traefik labels — written via printf to avoid shell backtick interpretation.
# DO NOT inline these as `docker run --label 'Host(\`foo\`)'` — the backticks
# get expanded by the remote shell. Always go through $LABELS_FILE.
TRAEFIK_LABELS=(
  'traefik.enable=true'
  'traefik.http.routers.kids-chore.rule=Host(`chores.ashbi.ca`) || Host(`kids-chore-app.ashbi.ca`) || Host(`kidschore.ashbi.ca`)'
  'traefik.http.routers.kids-chore.tls=true'
  'traefik.http.routers.kids-chore.tls.certresolver=letsencrypt'
  'traefik.http.services.kids-chore.loadbalancer.server.port=3000'
)

# ─────────────────────────────────────────────────────────────────────────────
# Flags
# ─────────────────────────────────────────────────────────────────────────────

SKIP_BUILD=0
DRY_RUN=0
ROLLBACK=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-build) SKIP_BUILD=1; shift ;;
    --dry-run)    DRY_RUN=1; shift ;;
    --rollback)   ROLLBACK=1; shift ;;
    -h|--help)
      sed -n '2,32p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown flag: $1" >&2
      echo "Try --skip-build | --dry-run | --rollback | --help" >&2
      exit 1
      ;;
  esac
done

# ─────────────────────────────────────────────────────────────────────────────
# Logging helpers
# ─────────────────────────────────────────────────────────────────────────────

log()  { printf '\033[1;34m[deploy]\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m[ok]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*" >&2; }
fail() { printf '\033[1;31m[fail]\033[0m %s\n' "$*" >&2; exit "${2:-1}"; }
step() { printf '\n\033[1;36m── %s ──\033[0m\n' "$*"; }

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

write_labels_file() {
  : > "$LABELS_FILE"
  for label in "${TRAEFIK_LABELS[@]}"; do
    printf '%s\n' "$label" >> "$LABELS_FILE"
  done
  ok "wrote $LABELS_FILE ($(wc -l < "$LABELS_FILE") lines)"
}

# ─────────────────────────────────────────────────────────────────────────────
# Step 1: Sanity check
# ─────────────────────────────────────────────────────────────────────────────

step "1/7  Sanity check"

if [[ "$DRY_RUN" != "1" ]]; then
  [[ "$(whoami)" == "root" ]] || fail "Must run as root (currently $(whoami))" 1
  [[ -d "$REPO_DIR" ]]      || fail "Repo dir $REPO_DIR missing" 1
  cd "$REPO_DIR"
  git rev-parse --git-dir >/dev/null 2>&1 || fail "Not a git repo" 1
  docker info >/dev/null 2>&1 || fail "docker daemon unreachable" 1
  [[ -f "$ENV_FILE" ]]      || fail "$ENV_FILE missing — copy from .env.example and fill in secrets" 1
  [[ "$ROLLBACK" == "1" ]] && ! docker inspect "$ROLLBACK_IMAGE" >/dev/null 2>&1 \
    && fail "$ROLLBACK_IMAGE tag missing — run a successful deploy first" 1
fi

ok "running as root in $REPO_DIR with docker reachable"

# ─────────────────────────────────────────────────────────────────────────────
# Rollback short-circuit
# ─────────────────────────────────────────────────────────────────────────────

if [[ "$ROLLBACK" == "1" && "$DRY_RUN" != "1" ]]; then
  step "ROLLBACK"
  log "rolling back to $ROLLBACK_IMAGE"
  write_labels_file
  docker rm -f "$CONTAINER_NAME" 2>&1 || warn "no existing container to remove"
  ROLLBACK_ID=$(docker run -d \
    --name "$CONTAINER_NAME" \
    --restart always \
    --network proxy \
    --env-file "$ENV_FILE" \
    --label-file "$LABELS_FILE" \
    "$ROLLBACK_IMAGE" 2>&1) || fail "rollback docker run failed" 5
  ok "rolled back → $ROLLBACK_ID"
  # Skip steps 2-6; fall through to health check (step 7)
  SKIP_BUILD=1
fi

# ─────────────────────────────────────────────────────────────────────────────
# Step 2: git pull
# ─────────────────────────────────────────────────────────────────────────────

if [[ "$ROLLBACK" != "1" ]]; then
  step "2/7  git pull"

  if [[ "$DRY_RUN" != "1" ]]; then
    BEFORE=$(git rev-parse HEAD)
    git fetch origin master 2>&1 | tail -3
    if ! git merge --ff-only origin/master 2>&1; then
      fail "git pull failed (local master diverged from origin/master). Manual intervention required." 2
    fi
    AFTER=$(git rev-parse HEAD)
    if [[ "$BEFORE" == "$AFTER" ]]; then
      ok "already at $AFTER — no new commits"
    else
      ok "moved $BEFORE → $AFTER"
    fi
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# Step 3: docker build (unless --skip-build)
# ─────────────────────────────────────────────────────────────────────────────

if [[ "$ROLLBACK" != "1" ]]; then
  step "3/7  docker build"

  if [[ "$SKIP_BUILD" == "1" ]]; then
    log "skipping build (--skip-build)"
  elif [[ "$DRY_RUN" != "1" ]]; then
    if docker build -t "$IMAGE_NAME" . 2>&1 | tail -5; then
      ok "built $IMAGE_NAME"
    else
      fail "docker build failed" 3
    fi
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# Step 4: prisma migrate deploy
# ─────────────────────────────────────────────────────────────────────────────

if [[ "$ROLLBACK" != "1" ]]; then
  step "4/7  prisma migrate deploy"

  if [[ "$DRY_RUN" != "1" ]]; then
    if docker run --rm \
        --network container:kids-chore-postgres \
        --env-file "$ENV_FILE" \
        -v "$REPO_DIR/prisma.config.ts":/app/prisma.config.ts:ro \
        "$IMAGE_NAME" npx prisma migrate deploy 2>&1 | tail -15; then
      ok "migrations applied"
    else
      fail "prisma migrate deploy failed — DO NOT proceed with container restart, schema and code will be out of sync" 4
    fi
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# Step 5: write Traefik labels file
# ─────────────────────────────────────────────────────────────────────────────

if [[ "$ROLLBACK" != "1" ]]; then
  step "5/7  write Traefik labels"

  if [[ "$DRY_RUN" != "1" ]]; then
    write_labels_file
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# Step 6: restart container
# ─────────────────────────────────────────────────────────────────────────────

if [[ "$ROLLBACK" != "1" ]]; then
  step "6/7  restart container"

  if [[ "$DRY_RUN" != "1" ]]; then
    OLD_SHA=$(docker inspect "$CONTAINER_NAME" --format '{{.Image}}' 2>/dev/null || echo "none")
    log "previous image SHA: $OLD_SHA"

    if [[ "$OLD_SHA" != "none" ]]; then
      docker tag "$OLD_SHA" "$ROLLBACK_IMAGE" 2>/dev/null \
        && ok "tagged $OLD_SHA as $ROLLBACK_IMAGE (rollback target)" \
        || warn "could not tag previous image — rollback may need manual intervention"
    fi

    docker rm -f "$CONTAINER_NAME" 2>&1 || warn "no existing container to remove"

    NEW_ID=$(docker run -d \
      --name "$CONTAINER_NAME" \
      --restart always \
      --network proxy \
      --env-file "$ENV_FILE" \
      --label-file "$LABELS_FILE" \
      "$IMAGE_NAME" 2>&1) || fail "docker run failed" 5

    ok "started $NEW_ID"
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# Step 7: health check
# ─────────────────────────────────────────────────────────────────────────────

step "7/7  health check"

if [[ "$DRY_RUN" != "1" ]]; then
  MAX_ATTEMPTS=20
  ATTEMPT=0
  SLEEP_SECONDS=2

  while (( ATTEMPT < MAX_ATTEMPTS )); do
    (( ATTEMPT++ )) || true
    HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$HEALTH_URL" 2>/dev/null || echo "000")
    log "attempt $ATTEMPT/$MAX_ATTEMPTS: HTTP $HTTP_CODE"

    if [[ "$HTTP_CODE" == "200" ]]; then
      ok "$HEALTH_URL returned 200 after $(( ATTEMPT * SLEEP_SECONDS ))s"
      printf '\n\033[1;32m✅ deploy complete\033[0m\n'
      printf '   image:    %s\n' "$IMAGE_NAME"
      printf '   container: %s\n' "$(docker ps --filter "name=$CONTAINER_NAME" --format '{{.ID}}' | head -1)"
      printf '   endpoint: %s\n' "$HEALTH_URL"
      [[ "$ROLLBACK" == "1" ]] && printf '   \033[1;33mmode:     ROLLBACK\033[0m\n'
      exit 0
    fi

    sleep "$SLEEP_SECONDS"
  done

  fail "$(cat <<EOF
health check failed after $(( MAX_ATTEMPTS * SLEEP_SECONDS ))s — $HEALTH_URL never returned 200.

Rollback hint:
  bash $REPO_DIR/scripts/deploy.sh --rollback
  (or manually:)
  docker rm -f $CONTAINER_NAME
  docker tag $ROLLBACK_IMAGE $IMAGE_NAME
  docker run -d --name $CONTAINER_NAME --restart always --network proxy \\
    --env-file $ENV_FILE --label-file $LABELS_FILE $IMAGE_NAME
EOF
  )" 6
fi

printf '\n\033[1;32m✅ dry run complete — no changes made\033[0m\n'
