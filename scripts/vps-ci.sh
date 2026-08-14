#!/usr/bin/env bash
# scripts/vps-ci.sh — ChoreChamps CI gate for the production VPS

set -euo pipefail

REPO_DIR="${CHORE_CHAMPS_CI_REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$REPO_DIR"

export CI="${CI:-true}"
export NODE_ENV="${NODE_ENV:-production}"
export DATABASE_URL="${DATABASE_URL:-postgresql://ci:ci@127.0.0.1:5432/chorechamps_ci}"
export NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-chore-champs-vps-ci-placeholder}"
export NEXTAUTH_URL="${NEXTAUTH_URL:-http://127.0.0.1:3000}"

log() { printf '\033[1;34m[vps-ci]\033[0m %s\n' "$*"; }
ok() { printf '\033[1;32m[ok]\033[0m %s\n' "$*"; }

[[ "$(git rev-parse --show-toplevel)" == "$REPO_DIR" ]] || {
  echo "CI checkout is not the expected repository: $REPO_DIR" >&2
  exit 1
}

log "revision $(git rev-parse --short HEAD)"
log "installing locked dependencies"
npm ci --no-audit --no-fund

log "generating Prisma client"
npx prisma generate

log "type checking"
npx tsc --noEmit

log "linting"
npm run lint

log "running unit tests"
npm test

log "validating store assets"
npm run store:validate

log "building production application"
npm run build

ok "VPS CI passed for $(git rev-parse HEAD)"
