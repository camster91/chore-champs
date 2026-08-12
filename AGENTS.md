# AGENTS.md

## Cursor Cloud specific instructions

ChoreChamps is a single Next.js 16 (App Router) app backed by PostgreSQL via Prisma. There is one service to run (the Next.js app) plus a local PostgreSQL database. Standard commands live in `package.json` (`dev`, `build`, `start`, `lint`, `test`, `seed`) and `README.md` / `SETUP_GUIDE.md`.

### Environment (already provisioned in the snapshot)
- PostgreSQL 16 is installed locally. DB name `chorechamps`; credentials come from the local `.env` (never commit real passwords).
- `.env` (gitignored) at the repo root must define `DATABASE_URL`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL=http://localhost:3000`. NextAuth refuses to start without `NEXTAUTH_SECRET` and `NEXTAUTH_URL`. See `.env.example` for the expected keys.
- The update script only runs `npm install` (its `postinstall` runs `prisma generate`). It does not start Postgres or touch the DB.

### Starting the app (do this each session)
- Start Postgres if it isn't running: `sudo pg_ctlcluster 16 main start` (verify with `pg_isready`).
- Run the dev server: `npm run dev` → http://localhost:3000. Health check: `curl http://localhost:3000/api/health` should report `"db":"connected"`.

### Database schema — use `db push`, NOT `migrate` (important gotcha)
- The committed Prisma migrations are drifted from `prisma/schema.prisma`: `prisma migrate deploy` leaves the DB missing columns like `Parent.recoveryCodes` (registration then 500s with `P2022 ColumnNotFound`), and `prisma db push` on top of a migrated DB fails on a `ChoreStatus` enum dependency.
- For local dev, sync the schema with `npx prisma db push` against a clean DB. To fully reset: `sudo -u postgres psql -c "DROP DATABASE IF EXISTS chorechamps;" && sudo -u postgres psql -c "CREATE DATABASE chorechamps;" && npx prisma db push`. (Prisma blocks `--force-reset` for AI agents, so drop/recreate via `psql` instead.)

### Known caveats
- `npm run seed` requires a reachable database and seeds the badge/avatar catalog rows. It uses the Prisma 7 PostgreSQL adapter configured in `prisma/seed.js`.
- Local development login uses non-secure NextAuth cookie names over HTTP; production uses the `__Secure-`-prefixed names over HTTPS.

### Lint / test / build
- Lint: `npm run lint`. Tests: `npm test` (node:test via tsx; unit tests for `src/lib/utils.ts` and `src/lib/gamification.ts`). Build: `npm run build` (runs `prisma generate` then `next build`).
- The Husky `pre-commit` hook runs `npm run lint` + `npm test`; the `commit-msg` hook enforces Conventional Commits. Both are skipped when `CI` is set.
