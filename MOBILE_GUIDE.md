# 📱 Mobile App Guide (iOS & Android)

ChoreChamps is now configured as a **Capacitor** project, which allows you to run it as a full-featured native app on iOS and Android.

## 1. Prerequisites

- **Android**: Install [Android Studio](https://developer.android.com/studio).
- **iOS**: Install [Xcode](https://developer.apple.com/xcode/) (requires a Mac).

## 2. Setup

I have already initialized Capacitor and added the `android/` and `ios/` native project folders.

## 3. How to Build & Run

### Step A: Deploy the Web App
Since this app uses Next.js Server Actions and Prisma, the mobile app must point to a hosted server.
1. Deploy your repository to [Vercel](https://vercel.com/) or another provider.
2. Once deployed, open `capacitor.config.ts` and update the `server.url` property:
   ```ts
   server: {
     url: 'https://your-app-name.vercel.app',
     androidScheme: 'https'
   }
   ```

### Step B: Sync to Native Projects
Every time you change the configuration or web code (if using local bundling), run:
```bash
npx cap sync
```

### Step C: Open in Native IDEs
Open the projects in their respective editors to build the final `.apk` (Android) or `.ipa` (iOS).

#### Android
```bash
npx cap open android
```
- In Android Studio, click **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
- The APK will be generated in `android/app/build/outputs/apk/debug/`.

#### iOS (Mac only)
```bash
npx cap open ios
```
- In Xcode, select your device and click the **Play** button to run.
- Use **Product > Archive** to prepare for the App Store.

## 4. Customizing App Icons & Splash Screens
1. Place a 1024x1024 icon as `assets/icon-only.png`.
2. Place a 2732x2732 splash image as `assets/splash.png`.
3. Run the generation tool:
   ```bash
   npx capacitor-assets generate
   ```

## 5. Native Features
You can now use Capacitor plugins to access native hardware (Camera, Notifications, Biometrics, etc.).
Example:
```bash
npm install @capacitor/camera
```
Then use it in your code just like a regular npm package!
