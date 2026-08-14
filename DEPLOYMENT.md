# chore-champs — Deployment Guide

## TL;DR

```bash
ssh hostinger
cd /root/chore-champs
bash scripts/deploy.sh                 # full deploy (pull + build + migrate + restart)
bash scripts/deploy.sh --rollback      # restart with the previous image
bash scripts/deploy.sh --dry-run       # preview what would happen
bash scripts/deploy.sh --skip-build    # only restart (image is already current)
```

## How it works

The `scripts/deploy.sh` script is the single command for everything chore-champs
deploys. It runs on the `hostinger` SSH alias as root, from `/root/chore-champs/`.

The seven steps it runs, in order:

| # | Step | Failure exit code |
|---|---|---|
| 1 | Sanity check (root, repo dir, docker, .env) | 1 |
| 2 | `git pull --ff-only origin master` | 2 |
| 3 | `docker build -t chore-champs:latest .` | 3 |
| 4 | `prisma migrate deploy` from the built image against running postgres | 4 |
| 5 | Write Traefik labels to `/tmp/chore-traefik.labels` via `printf` | — |
| 6 | Tag previous image as `chore-champs:previous` (rollback target), then `docker rm -f kids-chore-app && docker run -d` | 5 |
| 7 | Health-check loop: poll `https://chores.ashbi.ca/api/health` for HTTP 200 | 6 |

**Step 4 is critical**: it runs before the container restart, so the schema and
code are always in sync. If migrations fail, the deploy aborts and the old
container keeps serving.

## Why the labels need `printf`

Traefik's `Host()` rule needs backticks around the hostname, like
`Host(\`chores.ashbi.ca\`)`. Inline `--label 'Host(\`foo\`)'` looks like it should
work, but backticks get expanded by the remote bash before `docker run` sees
them. Result: the label becomes `Host()`, Traefik can't route, every hostname
returns 404.

The fix is to write the labels to a file via `printf '%s\n'` (which treats its
arguments as literal strings, no shell expansion) and pass the file via
`--label-file`. This is documented in detail in
`~/.hermes/skills/devops/traefik-label-deploy-via-ssh/SKILL.md`.

**Rule of thumb:** if the deploy command has backticks anywhere, write it to a
file first.

## Rollback

Before the Docker build, each deploy protects the currently running image as
`chore-champs:previous`. This avoids losing the rollback target when a build
replaces an untagged image. Each successful deploy then retains that protected
last-known-good image. To roll back:

```bash
ssh hostinger
bash /root/chore-champs/scripts/deploy.sh --rollback
```

This restarts the container with the `:previous` image, then runs the same
health-check loop. If health check fails after rollback, the script exits
with code 6 and prints the manual recovery steps.

Build deploys update the `:previous` tag to the image that was running before
the new build. A `--skip-build` deploy preserves the existing rollback target
instead of replacing it with the image currently running.

If Docker cannot tag the previous image by digest, the deploy script uses
`docker commit` on the live container instead of `docker export`/`docker import`.
This preserves the image command, entrypoint, and working directory required to
start the rollback. The rollback snapshot was verified against `/api/health`
on 2026-08-14, then the current release was restored and authenticated smoke
QA passed. No-build synchronization preserved the protected rollback target.

Production health is also checked every 15 minutes by the GitHub Actions
`Production Health` workflow. It verifies the database-backed health endpoint
and the public homepage, auth, privacy, robots, and sitemap routes.

The production host independently runs `chore-champs-health.timer` every 15
minutes. Its `chore-champs-health.service` checks the same public surfaces plus
the manifest and every declared icon, with retry handling for transient proxy
responses. Results are retained in the system journal:

```bash
systemctl status chore-champs-health.timer
journalctl -u chore-champs-health.service --since today
```

For a repeatable authenticated browser smoke test, run from a trusted machine:

```bash
npm run smoke:production
CHORE_CHAMPS_SCREENSHOT_DIR=artifacts/qa-live npm run smoke:production
```

The script creates a synthetic `example.invalid` account when no QA email is
provided, verifies the unauthenticated redirect, exercises every protected
route, checks mobile overflow and browser console errors, and can save a
dashboard screenshot. Never pass a real user's credentials to this script.

The host also runs `chore-champs-backup.timer` four times daily. Each run writes
a mode-700 PostgreSQL custom-format dump to `/var/backups/chore-champs`, verifies
the archive catalog with `pg_restore`, writes a SHA-256 sidecar, and removes
archives older than 14 days:

```bash
systemctl status chore-champs-backup.timer
journalctl -u chore-champs-backup.service --since today
ls -l /var/backups/chore-champs
```

The backup is an on-host recovery point; it is not an off-host disaster-recovery
copy. Copy a verified dump to separately managed storage before treating it as
protection against VPS loss.

## Idempotency

Safe to re-run. If nothing has changed on origin/master, `git pull` is a no-op,
`docker build` rebuilds an identical image, `prisma migrate deploy` prints
"No pending migrations to apply.", and the container restart is harmless.

Typical re-run on a no-change deploy is fast because migrations use the Prisma
CLI already present in the built image; no dependency installation is required
on the production host.

## What this script does NOT do

- **Push to origin.** That's your job — review the local commits, decide
  whether to push, then `git push` from `/Users/biancabienaime/repos/chore-champs/`
  on your Mac, then come here and run the deploy.
- **Open or close GitHub issues.** The kanban
  (`~/.hermes/kanban/boards/chore-champs/`) tracks what to ship; this script
  only ships code that already landed on master.
- **Off-host disaster recovery.** The host timer creates verified local dumps,
  but this script does not transfer them to separately managed storage.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| "git pull failed (local master diverged)" | Local `/root/chore-champs` has unpushed commits | `git log --oneline` to find them, push or reset before redeploying |
| "prisma migrate deploy failed" | Schema drift between repo and prod | Fix and test a committed migration against a clean local database, push it, then retry |
| "health check failed after 40s" | App didn't bind to port 3000, or Traefik didn't pick up the new container | `docker logs kids-chore-app --tail 50` to see app errors; check `/tmp/chore-traefik.labels` content if 502 |
| Container starts but Traefik returns 404 | Labels got mangled (backtick issue) | Run `bash scripts/deploy.sh --dry-run` then inspect the file the script would write |
| `chore-champs:previous` missing | First-ever deploy, or previous deploy failed before tagging | There's nothing to roll back to — fix forward instead |

## Source of truth

The script lives at `scripts/deploy.sh` in the repo and is also checked out at
`/root/chore-champs/scripts/deploy.sh` on the host. They stay in sync via
`git pull` in step 2.

To change the script:
1. Edit `scripts/deploy.sh` locally
2. Commit + push to origin/master
3. The next deploy (or manual `git pull` on the host) picks up the change

Don't edit the host copy directly — it gets overwritten on the next pull.
