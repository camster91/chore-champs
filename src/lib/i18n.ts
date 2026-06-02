// Minimal i18n for ChoreChamps — English only for now, structured for future locales
export const translations = {
  en: {
    landing: {
      heroTitle: "Make Chores Fun!",
      heroSubtitle: "Turn everyday tasks into an exciting game for kids. Track, earn, and celebrate together!",
      ctaPrimary: "Get Started",
      ctaSecondary: "Learn More",
      ctaCreate: "Create Free Account",
      ctaJoin: "Join thousands of families making chores fun!",
      ctaLogIn: "Log In",
      ctaReady: "Ready to become a ChoreChamp?",
      ctaStart: "Start",
      footer: "Made with love for families everywhere",
      featuresTitle: "Why Kids Love It",
      trackChores: "Track Chores",
      trackChoresDesc: "Make daily chores fun with colorful cards and satisfying check-offs!",
      earnPoints: "Earn Points",
      earnPointsDesc: "Complete tasks to earn coins and climb the leaderboard!",
      winBadges: "Win Badges",
      winBadgesDesc: "Unlock cool achievements and show off your progress!",
      buildStreaks: "Build Streaks",
      buildStreaksDesc: "Keep your streak alive by completing tasks every day!",
    },
    auth: {
      accountCreated: "Account created successfully!",
      alreadyHaveAccount: "Already have an account?",
      createAccount: "Create Account",
      createAccountJoinFamily: "Create an account to join your family!",
      createYourFamily: "Create Your Family",
      creatingYourAccount: "Creating your account...",
      dontHaveAccount: "Don't have an account?",
      email: "Email",
      failedToCreateAccount: "Failed to create account",
      invalidCredentials: "Invalid email or password",
      joinFamily: "Join Family",
      joiningFamily: "Joining your family...",
      password: "Password",
      emailPlaceholder: "you@example.com",
      settingUpFamily: "Setting up your family...",
      signIn: "Sign In",
      signInToContinue: "Sign in to continue",
      signUp: "Sign Up",
      somethingWentWrong: "Something went wrong. Please try again.",
      startAdventure: "Start Your Adventure",
      welcomeBack: "Welcome Back",
    },
    common: {
      add: "Add",
      age: "Age",
      back: "Back",
      description: "Description",
      name: "Name",
      passwordMin: "Min 8 characters",
    },
    dashboard: {
      addChild: "Add Child",
      addFirstKid: "Add Your First Kid",
      addKid: "Add Kid",
      addSampleData: "Add Sample Data",
      completed: "Completed",
      noChoresYet: "No chores yet. Add some or load sample data!",
      points: "Points",
      toDo: "To Do",
      todaysChores: "Today's Chores",
      welcome: "Welcome back",
      welcomeSubtitle: "Let's get your family started with some fun chores!",
      welcomeTitle: "Welcome to ChoreChamps!",
    },
    profile: {
      achievements: "Achievements",
      active: "Active",
      choresDone: "Chores Done",
      profileSettings: "Profile Settings",
      selectKidToViewProfile: "Select a kid to view their profile",
      switchKid: "Switch Kid",
      yearsOld: "years old",
    },
    habits: {
      addHabit: "Add Habit",
      buildHealthyRoutines: "Build healthy routines with daily habits",
      createNewHabit: "Create New Habit",
      eGDrinkWater: "e.g. Drink Water",
      habitName: "Habit Name",
      noHabitsYet: "No Habits Yet",
      selectKidToViewHabits: "Select a kid to view their habits",
      title: "Habits",
      todaysProgress: "Today's Progress",
    },
    rewards: {
      addReward: "Add Reward",
      createReward: "Create Reward",
      eGExtraScreenTime: "e.g. Extra Screen Time",
      icon: "Icon",
      motivateWithRewards: "Motivate your kids with exciting rewards",
      noRewardsYet: "No Rewards Yet",
      optional: "Optional",
      pointsCost: "Points Cost",
      pts: "pts",
      redeem: "Redeem",
      rewardName: "Reward Name",
      selectKidToViewRewards: "Select a kid to view their rewards",
      title: "Rewards",
    },
    chores: {
      addChore: "Add Chore",
      addNewChore: "Add New Chore",
      chooseKidToSeeChores: "Choose a kid to see their chores",
      choreName: "Chore Name",
      completeTasks: "Complete tasks to earn points and badges!",
      createAChore: "Create a Chore",
      createChore: "Create Chore",
      creating: "Creating...",
      descriptionOptional: "Description (Optional)",
      eGCleanBedroom: "e.g. Clean Bedroom",
      goToProfiles: "Go to Profiles",
      noChoresYetCreate: "No chores yet",
      pointsReward: "Points Reward",
      selectProfile: "Select Profile",
      tidyUpToys: "Tidy up toys and organize",
      title: "Chores",
      xp: "XP",
    },
    navigation: {
      allChores: "All Chores",
      avatarShop: "Avatar Shop",
      habits: "Habits",
      rewards: "Rewards",
    },
  },
} as const;

export type Locale = keyof typeof translations;
export type Namespace = keyof typeof translations.en;

function resolveTranslation(key: string, locale: Locale = 'en'): string {
  const parts = key.split('.');
  let current: unknown = translations[locale];
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  return typeof current === 'string' ? current : key;
}

export function useTranslation(locale: Locale = 'en') {
  const t = (key: string) => resolveTranslation(key, locale);
  return { t, locale };
}

export const t = (key: string, locale: Locale = 'en'): string => {
  return resolveTranslation(key, locale);
};

// --- Init function (used in useEffect / server setup) ---
export function initI18n(_locale?: string): void {
  // No-op for now — English only, no async loading needed
  void _locale;
}

// --- Sample data for onboarding (localised labels) ---
export function getLocalizedSampleData(locale: Locale = 'en') {
  const tl = (k: string) => t(k, locale);
  return {
    kids: [
      { name: 'Emma', age: 7, avatarId: 'star' },
      { name: 'Noah', age: 5, avatarId: 'rocket' },
    ],
    chores: [
      { title: tl('dashboard.todaysChores') + ': Make Bed', description: 'Make your bed every morning', basePoints: 5, icon: '🛏️', difficulty: 'EASY' as const, key: 'make_bed' },
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
