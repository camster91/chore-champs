import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chorechamps.app',
  appName: 'ChoreChamps',
  webDir: 'out',
  server: {
    // Replace with your production URL once deployed
    // url: 'https://chore-champs.vercel.app',
    // cleartext: true, // Set to true if testing with local IP over HTTP
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
