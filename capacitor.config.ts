import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chorechamps.app',
  appName: 'ChoreChamps',
  webDir: 'out',
  server: {
    // ChoreChamps uses server actions and Prisma, so the native shell loads
    // the deployed Next.js app instead of attempting a static export.
    url: 'https://chores.ashbi.ca',
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#6366f1',
      showSpinner: true,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
