// Minimal i18n for ChoreChamps — English only for now, structured for future locales
export const translations = {
  en: {
    landing: {
      heroTitle: "Make Chores Fun!",
      heroSubtitle: "Turn everyday tasks into an exciting game for kids. Track, earn, and celebrate together!",
      ctaPrimary: "Get Started",
      ctaSecondary: "Learn More",
      featuresTitle: "Why Kids Love It",
      trackChores: "Track Chores",
      trackChoresDesc: "Make daily chores fun with colorful cards and satisfying check-offs!",
      earnPoints: "Earn Points",
      earnPointsDesc: "Complete tasks to earn coins and climb the leaderboard!",
      winBadges: "Win Badges",
      winBadgesDesc: "Unlock cool achievements and show off your progress!",
      buildStreaks: "Build Streaks",
      buildStreaksDesc: "Keep your streak alive by completing tasks every day!",
      ctaReady: "Ready to become a ChoreChamp?",
      ctaJoin: "Join thousands of families making chores fun!",
      ctaCreate: "Create Free Account",
      ctaLogIn: "Log In",
      ctaStart: "Start",
      footer: "Made with love for families everywhere",
    },
    auth: {
      signIn: "Sign In",
      signUp: "Sign Up",
      createAccount: "Create Account",
      joinFamily: "Join Family",
      createYourFamily: "Create Your Family",
      startAdventure: "Start Your Adventure",
      settingUpFamily: "Setting up your family...",
      joiningFamily: "Joining your family...",
      forgotPassword: "Forgot Password?",
      dontHaveAccount: "Don't have an account?",
      alreadyHaveAccount: "Already have an account?",
      failedToCreateAccount: "Failed to create account",
    },
    dashboard: {
      title: "Dashboard",
      welcome: "Welcome back",
      todayChores: "Today's Chores",
      points: "Points",
      gems: "Gems",
      streak: "Streak",
      level: "Level",
    },
  },
} as const;

export type Locale = keyof typeof translations;
export type Namespace = keyof typeof translations.en;

// --- Client-side hook ---
export function useTranslation(locale: Locale = 'en') {
  const t = (key: string) => {
    const parts = key.split('.');
    let current: any = translations[locale];
    for (const part of parts) {
      current = current?.[part];
    }
    return current ?? key;
  };
  return { t, locale };
}

// --- Server/client-compatible translation function ---
export const t = (key: string, locale: Locale = 'en'): string => {
  const parts = key.split('.');
  let current: any = translations[locale];
  for (const part of parts) {
    current = current?.[part];
  }
  return current ?? key;
};

// --- Init function (used in useEffect / server setup) ---
export function initI18n(_locale?: string): void {
  // No-op for now — English only, no async loading needed
}

// --- Sample data for onboarding (localised labels) ---
export function getLocalizedSampleData(locale: Locale = 'en') {
  const tl = (k: string) => t(k, locale);
  return {
    kids: [
      { name: 'Emma', age: 7, emoji: '🌟' },
      { name: 'Noah', age: 5, emoji: '🚀' },
    ],
    chores: [
      { title: tl('dashboard.todayChores') + ': Make Bed', description: 'Make your bed every morning', basePoints: 5, icon: '🛏️', difficulty: 'EASY' as const, key: 'make_bed' },
      { title: 'Tidy Room', description: 'Pick up toys and put them away', basePoints: 10, icon: '🧹', difficulty: 'MEDIUM' as const, key: 'tidy_room' },
      { title: 'Help with Dishes', description: 'Load or unload the dishwasher', basePoints: 15, icon: '🍽️', difficulty: 'HARD' as const, key: 'help_dishes' },
    ],
    rewards: [
      { title: 'Extra Screen Time', description: '30 minutes of extra tablet/TV time', cost: 50, category: 'Fun', icon: '📱' },
      { title: 'Ice Cream Night', description: 'Family ice cream trip after dinner', cost: 100, category: 'Treat', icon: '🍦' },
    ],
    habits: [
      { title: 'Brush Teeth', description: 'Brush morning and night', icon: '🦷', streak: 3, points: 2 },
      { title: 'Read 20 Mins', description: 'Read a book for 20 minutes', icon: '📚', streak: 5, points: 5 },
    ],
    familyGoal: {
      title: 'Clean House Weekend',
      description: 'Everyone works together to clean the whole house',
      targetPoints: 500,
      reward: 'Family Movie Night 🎬',
    },
    messages: {
      welcome: tl('dashboard.welcome'),
      alreadyHasData: 'Your family already has data! No sample data added.',
      sampleAdded: 'Sample data added successfully! Happy chore tracking!',
    }
  };
}
