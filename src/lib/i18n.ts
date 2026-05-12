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
      footer: "Made with ❤️ for families everywhere",
    },
  },
} as const;

export type Locale = keyof typeof translations;
export type Namespace = keyof typeof translations.en;

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
