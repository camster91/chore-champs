# Changelog

All notable changes to chore-champs are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/), but Cam uses a date-prefixed
flat list rather than semver because there's no public release cadence.

## [Unreleased]

### Added
- **Gamification engine** (`src/lib/gamification.ts`) — streak tracking,
  multipliers (1.25x–2.0x at 3/7/14/30-day milestones), level-ups at 50/150/300/500
  point thresholds (`src/lib/constants.ts`). 38 unit tests in
  `src/lib/gamification.test.ts`.
- **Celebration modal** (`src/components/CelebrationModal.tsx`) — confetti
  bursts via `canvas-confetti`, tier-specific milestone animations
  (3/7/14/30/50-day), level-up trophy animation. Hook: `src/hooks/useCelebration.ts`.
- **Streak widget** (`src/components/StreakWidget.tsx`) — 🔥 pill on the
  dashboard showing current/longest streak with animated count-up.
- **Deploy automation** (`scripts/deploy.sh`) — 7-step idempotent script with
  `--dry-run`, `--skip-build`, and `--rollback` flags. Health-check loop
  ensures the deploy is actually serving before exiting. See `DEPLOYMENT.md`.
- **Pre-commit hooks** (`.husky/`) — runs `lint` + `test` on every commit.
  Also enforces Conventional Commits format on commit messages.
- **Project kanban** (`~/.hermes/kanban/boards/chore-champs/`) — auto-regenerated
  from GitHub + `REPO-REVIEW-1.md`. Tracks open PRs + 13 review findings.

### Changed
- **`src/lib/auth/auth.ts`** — middleware (`src/middleware.ts`) renamed to
  proxy (`src/proxy.ts`) per Next.js 16's deprecation.
- **`prisma/schema.prisma`** — Kid model gains `currentStreak`, `longestStreak`,
  `lastCompletedAt`. The old `streakDays` field is preserved in migration
  history (see `prisma/migrations/20260722000000_*`); data was backfilled before
  the column drop.
- **`src/stores/kid-store.ts`** — `Kid` interface extended with streak fields,
  persist `version: 2` + `migrate` callback backfills defaults for users
  upgrading from pre-gamification versions.
- **`src/actions/kids.ts`** — `getKids` now selects and returns the streak
  fields (`lastCompletedAt` serialized to ISO string).

### Security
- **`docker-compose.prod.yml`** — secrets now read from `.env.production`
  via `env_file`, not hardcoded. PR #178.

### Fixed
- **#190, #191** — closed. Both carried a Prisma 7 adapter revert that would
  have broken prod. Branched pre-fix.
- **#192** — closed. Superseded by #193 (full engine + migration shipped).
- **#194** — Next 16.2.10 → 16.2.11 patch bump (fixes middleware deprecation
  warning).

## Migration Notes

For existing deploys, after pulling these changes:

```bash
ssh hostinger
cd /root/chore-champs
bash scripts/deploy.sh
```

The deploy script runs `prisma migrate deploy` automatically before restarting
the container. For older deploys that pre-date `scripts/deploy.sh`, run
`prisma migrate deploy` manually first.

## Rollback

```bash
ssh hostinger
bash /root/chore-champs/scripts/deploy.sh --rollback
```

Restarts the container with the previous image (`chore-champs:previous`).
See `DEPLOYMENT.md` for the full troubleshooting table.