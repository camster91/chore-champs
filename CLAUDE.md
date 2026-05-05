# CLAUDE.md — ChoreChamps

## What This Is
A gamified chore tracker for kids. "ChoreChamps". Built with Next.js.

## Stack
- Next.js (App Router)
- Prisma + PostgreSQL
- NextAuth for session management
- Tailwind
- Zustand for client state
- Framer Motion for animations

## Database
- PostgreSQL via Prisma ORM
- Connection configured via DATABASE_URL environment variable
- See .env.example for required env vars

## Auth
- Credentials-based NextAuth (email + password)
- Parent accounts with linked family and child profiles
- JWT session strategy

## Deployment
- Target: chores.ashbi.ca
- Docker + Coolify
- See docker-compose.yml for local development

## Seed
- `npx prisma db seed` runs prisma/seed.js
- Creates: parent account, 2 children, sample chores and rewards

## DO NOT
- Do not revert to Supabase — fully migrated to self-hosted Postgres
- Do not commit credentials or secrets to the repository
- Do not change the database provider from PostgreSQL
