# Kids Chore App - Setup Guide

## Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** or **yarn** or **pnpm**
3. **Docker Desktop** (for PostgreSQL database) OR **PostgreSQL** installed locally
4. **Git** (optional)

## Quick Start (Recommended)

### Option A: Automatic Setup (Windows)
1. Run the setup script:
   ```cmd
   start-dev.bat
   ```

This will:
- Start PostgreSQL database using Docker
- Generate Prisma client
- Create database schema
- Seed with sample data
- Start the development server at http://localhost:3000

### Option B: Manual Setup

#### 1. Clone and install dependencies
```bash
# Already in the kids-chore-app directory
npm install
```

#### 2. Start PostgreSQL Database

**Using Docker (recommended):**
```bash
docker-compose up -d
```

**Using existing PostgreSQL:**
- Ensure PostgreSQL is running on port 5432
- Update `.env` with your credentials:
  ```
  DATABASE_URL="postgresql://username:password@localhost:5432/kids_chore_app"
  ```

#### 3. Setup Database
```bash
# Generate Prisma Client
npx prisma generate

# Create database schema
npx prisma db push

# Seed with sample data
npm run seed
```

#### 4. Start Development Server
```bash
npm run dev
```

The app will be available at: http://localhost:3000

## Test Credentials

After seeding, you can log in with:
- **Email**: `parent@example.com`
- **Password**: `password123`

## Project Structure

```
src/
├── app/                    # Next.js 14 App Router
│   ├── (dashboard)/       # Authenticated dashboard routes
│   ├── login/            # Login page
│   ├── signup/           # Signup page
│   └── page.tsx          # Landing page
├── components/           # React components
│   ├── ui/              # Reusable UI components
│   ├── gamification/    # Points, badges, streaks
│   └── themes/          # Theme components
├── lib/                  # Utility libraries
│   ├── auth/            # NextAuth configuration
│   └── db/              # Database client
├── stores/              # Zustand state management
└── types/               # TypeScript types
```

## Features Implemented

✅ **Authentication** - Parent login/signup with NextAuth
✅ **Multi-kid profiles** - Each kid has their own theme and stats
✅ **Chore management** - Create, assign, track chores
✅ **Gamification** - Points, levels, streaks, badges
✅ **Rewards system** - Kids can redeem points for rewards
✅ **Habit tracking** - Daily habit logging
✅ **Planner** - Schedule items for kids
✅ **Theming** - Boy/girl/neutral themes with custom colors
✅ **Responsive design** - Works on mobile and desktop

## Database Schema

The app uses PostgreSQL with Prisma ORM. Key models:

- **Parent** - Account holder
- **Family** - Family unit (one per parent)
- **Kid** - Child profiles with gamification stats
- **Chore** & **ChoreAssignment** - Task management
- **Reward** & **RedeemedReward** - Reward system
- **BadgeDefinition** & **EarnedBadge** - Achievement system
- **Habit** & **HabitLog** - Daily habit tracking
- **PlannerItem** - Schedule items
- **AvatarItem** - Customizable avatars

## Development

### Useful Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Reset database (clears all data and reseeds)
npm run prisma:reset

# Run seed only
npm run seed
```

### Environment Variables

Create `.env` file (`.env.example` provided):

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kids_chore_app"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

Generate NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

## Deployment

### Vercel (Recommended for Next.js)
1. Push to GitHub/GitLab
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Self-hosted
1. Build: `npm run build`
2. Start: `npm start`
3. Ensure PostgreSQL database is accessible
4. Set environment variables in production

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running: `docker-compose ps`
- Check connection: `npx prisma db execute --stdin --url "your-connection-string"`
- Reset database: `npm run prisma:reset`

### NextAuth Issues
- Verify `NEXTAUTH_SECRET` is set
- Check `NEXTAUTH_URL` matches your deployment URL

### Build Errors
- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`

## License

MIT