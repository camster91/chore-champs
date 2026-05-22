# ChoreChamps - Kids Chore & Habit Tracker

**A gamified chore tracking application designed to help kids build responsibility through positive reinforcement.**

ChoreChamps transforms household tasks into exciting quests for children. Parents can assign chores, set point values, and track progress, while kids earn points, unlock badges, and claim rewards in a fun, interactive environment.

## Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - Latest React with improved performance
- **Tailwind CSS 4** - Modern utility-first styling
- **Framer Motion** - Smooth animations for gamified UX
- **Geist** - Modern typography
- **Lucide React** - Icon library

### State Management
- **Zustand** - Lightweight global state management
- **tailwind-merge** - Utility for conditional Tailwind classes
- **clsx** - Class name utility

### Backend & Database
- **Prisma** - Type-safe ORM
- **PostgreSQL** - Primary database
- **NextAuth.js** - Authentication system

### Analytics
- **PostHog** - Product analytics and tracking

## Key Features

### For Parents
- **Dashboard Management** - Create, assign, and manage chores for multiple children
- **Point Configuration** - Set custom point values for different tasks
- **Approval System** - Review and approve completed chores
- **Reward Management** - Define rewards and point requirements
- **Progress Tracking** - Monitor child engagement and task completion history

### For Kids
- **Gamified Interface** - Visual, avatar-driven experience where chores become quests
- **Points System** - Earn points for completing tasks
- **Badges & Achievements** - Unlock badges for consistent performance
- **Rewards Store** - Redeem points for parent-defined rewards
- **Progress Visualization** - See streaks, totals, and upcoming goals

### Technical Features
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Real-time Updates** - Instant synchronization across devices
- **Secure Authentication** - Family-based account management
- **Progressive Web App** - Install on mobile devices

## Installation

### Prerequisites
- Node.js 18+
- PostgreSQL database

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/camster91/kids-chore-app.git
   cd kids-chore-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env.local` file with:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/chorechamps"
   NEXTAUTH_SECRET="your-secret-key-here"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. **Initialize the database**
   ```bash
   npx prisma generate
   npx prisma db push
   npm run seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

Visit `http://localhost:3000` to access the application.

## Usage

### Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:migrate   # Run database migrations
npm run db:push      # Push schema changes
npm run seed         # Seed database with sample data
```

### Sample Workflow

1. **Parent Sign Up**: Create a family account
2. **Add Children**: Set up individual profiles for each child
3. **Create Chores**: Add daily, weekly, or one-time tasks with point values
4. **Define Rewards**: Set up the rewards store with point requirements
5. **Kids Complete Tasks**: Children mark chores as complete
6. **Approve & Award Points**: Parents review and approve submissions
7. **Redeem Rewards**: Kids claim rewards when they have enough points

## Project Structure

```
kids-chore-app/
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── (auth)/        # Authentication routes (login, signup)
│   │   ├── (dashboard)/   # Main app routes (dashboard, chores, habits, rewards, profile, settings)
│   │   ├── api/           # API routes
│   │   ├── invite/        # Public invite acceptance pages
│   │   └── layout.tsx     # Root layout
│   ├── actions/           # Server Actions (data fetching & mutations)
│   ├── components/        # Reusable UI components
│   │   ├── ui/            # Generic UI primitives
│   │   └── gamification/  # Points, badges, confetti, level-up modals
│   ├── lib/               # Utility functions, auth, db, rate-limiter
│   ├── stores/            # Zustand state stores
│   └── types/             # TypeScript type declarations
├── prisma/                # Database schema and seeds
│   ├── schema.prisma      # Prisma schema
│   └── seed.js            # Sample data seeding
├── public/                # Static assets & PWA service worker
├── Dockerfile             # Multi-stage production build
├── docker-compose.yml     # Local development with Postgres
└── entrypoint.sh          # Runtime env checks & startup
```

## Database Schema

Key entities:
- **Family** - Parent accounts
- **Child** - Child profiles linked to families
- **Chore** - Task definitions with point values
- **ChoreAssignment** - Links chores to children
- **ChoreCompletion** - Records of completed chores
- **Reward** - Available rewards with point costs
- **Redemption** - Records of reward claims
- **Badge** - Achievement definitions
- **BadgeEarned** - Badge awards to children

## Docker Deployment

```bash
# Build
docker build -t chorechamps .

# Run
docker run -p 3000:3000 --env-file .env.production chorechamps
```

## Roadmap

- [ ] Consolidate authentication with family-planner module
- [ ] Implement push notifications for daily reminders
- [ ] Generate Android/iOS app store builds
- [ ] Add optional subscription tiers for premium content
- [ ] Implement weekly consistency tracking
- [ ] Add AI-suggested age-appropriate chores

## License

Private - This project is proprietary and confidential.

## Author

Developed by Cameron Ashley / Nexus AI.
