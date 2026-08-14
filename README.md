# ChoreChamps — Kids Chore & Habit Tracker

**A gamified chore tracking application designed to help kids build responsibility through positive reinforcement.**

**Live:** chores.ashbi.ca  
**Price:** $1.99 USD (one-time purchase, no subscription)  
**Repo:** github.com/camster91/chore-champs

---

## Overview

ChoreChamps transforms household tasks into exciting quests for children. Parents can assign chores, set point values, and track progress, while kids earn points, unlock badges, and claim rewards in a fun, interactive environment.

- **For parents:** Create and assign chores, set point values, approve completions, and manage a rewards store.
- **For kids:** See assigned chores, earn points, unlock badges for streaks, and redeem points for rewards.
- **No subscriptions. No ads. One $1.99 purchase.**

---

## Tech Stack

### Frontend
- **Next.js 16** (React 19) — App Router
- **Tailwind CSS 4** — styling
- **Framer Motion** — gamified animations
- **Geist** — typography
- **Lucide React** — icons
- **Zustand** — client state

### Backend & Database
- **Prisma** — type-safe ORM
- **PostgreSQL** — database (self-hosted, Coolify)
- **NextAuth.js** — authentication (credentials, JWT sessions)

### Mobile
- **Capacitor** — wraps the PWA for iOS and Android
- **Capacitor Config:** `com.chorechamps.app`

---

## Key Features

### Parents
- Dashboard to create, assign, and manage chores for multiple children
- Set custom point values per chore
- Review and approve completed chores before points are awarded
- Define rewards with point costs
- Monitor child engagement and completion history

### Kids
- Colorful, gamified chore dashboard
- Earn points for approved chore completions
- Unlock badges for streaks and consistency
- Redeem points for parent-defined rewards
- See progress, totals, and upcoming goals

### Technical
- Responsive — works on phone, tablet, and desktop
- Real-time sync across family devices
- PWA — install on mobile devices
- Family-based auth with parent-controlled child profiles

---

## Privacy & Compliance

- **No ads, no third-party behavioral advertising**
- **No data sold or shared with any third party**
- **Parent accounts control all child data — full access and deletion rights**
- **COPPA-compliant** for children under 13 in the United States
- Privacy policy: `privacy-policy.md` (must be hosted at a public URL before App Store submission)

---

## App Store Listing

Full App Store and Google Play Store metadata is in `store-listing.md`, including:
- iOS subtitle, description, keywords, and what's new
- Google Play short and full descriptions
- Screenshot requirements and asset guidelines

---

## Submission Checklist

Before submitting to the Apple App Store or Google Play Store, complete every step in `submission-checklist.md`. Key items:

**Apple App Store:**
- Bundle ID: `com.chorechamps.app`
- Set "Made for Kids" to YES
- Host privacy policy at a public URL
- Build: `npm run build && npx cap sync ios` → Xcode archive → App Store Connect

**Google Play Store:**
- Package: `com.chorechamps.app`
- Complete Data Safety form (includes children's data section)
- Host privacy policy at a public URL
- Build: `npm run build && npx cap sync android` → Android Studio APK/AAB → Play Console

---

## Repository

```
github.com/camster91/chore-champs
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database

### Setup

```bash
# Clone
git clone https://github.com/camster91/chore-champs.git
cd chore-champs

# Install
npm install

# Environment
cp .env.example .env
# Fill in DATABASE_URL, NEXTAUTH_SECRET, and NEXTAUTH_URL=http://localhost:3000

# Database
npx prisma generate
npx prisma db push
npm run seed   # creates sample parent account, 2 children, chores, rewards
```

For a Docker-backed local database, `start-dev.bat` or `docker-compose up -d postgres`
uses the safe development defaults from `.env.example`. The full compose app uses
the internal `postgres` hostname automatically; the host-run Next.js app uses
`localhost`.

> **Local development:** Use a clean local PostgreSQL database with `npx prisma db push`. The historical migration chain has drifted from the current Prisma 7 schema, so `migrate dev` is not the local setup path.
>
> **Production:** Apply committed migrations with `npx prisma migrate deploy` through `scripts/deploy.sh`. Do not use `db push` against production.

## Develop
npm run dev
# → http://localhost:3000
```

### Build for Production

```bash
npm run build
```

### Mobile (Capacitor)

```bash
# iOS
npx cap sync ios
# Open ios/ folder in Xcode, archive, and upload to App Store Connect

# Android
npx cap sync android
# Open android/ folder in Android Studio, build APK, and upload to Play Console
```

### Docker (self-hosted)

```bash
# Local dev with Postgres
docker-compose up

# Production
docker build -t chorechamps .
docker run -p 3000:3000 --env-file .env.production chorechamps
```

---

## Database Schema

Key entities: `Family` (parent accounts), `Kid` (child profiles), `Chore` (tasks), `ChoreAssignment` (links and completion state), `Reward`, `Redemption`, `BadgeDefinition`, `EarnedBadge`, `Habit`, and `HabitLog`.

Full schema: `prisma/schema.prisma`

---

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run seed` | Seed database with sample data |
| `npm run test:e2e` | Run Playwright browser smoke tests (set `E2E_AUTH=1` for the authenticated flow) |
| `npx prisma db push` | Sync a clean local development database |
| `npm run db:migrate` | Safe local alias for `npm run db:push` (historical migrations are not used locally) |
| `npx prisma migrate deploy` | Apply committed migrations in production |
| `npx cap sync ios` | Sync web build to iOS |
| `npx cap sync android` | Sync web build to Android |

---

## Roadmap

- [ ] Push notifications for daily reminders
- [ ] Weekly consistency tracking
- [ ] AI-suggested age-appropriate chores
- [ ] Subscription tiers for premium content (optional)

---

*Built by Cameron Ashley — ChoreChamps v1.0 — chores.ashbi.ca*
