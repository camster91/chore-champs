# 📱 Mobile App Guide (iOS & Android)

ChoreChamps is now configured as a **Capacitor** project, which allows you to run it as a full-featured native app on iOS and Android.

## 1. Prerequisites

- **Android**: Install [Android Studio](https://developer.android.com/studio).
- **iOS**: Install [Xcode](https://developer.apple.com/xcode/) (requires a Mac).

## 2. Setup

I have already initialized Capacitor and added the `android/` and `ios/` native project folders.

## 3. How to Build & Run

Since this app uses Next.js Server Actions and Prisma, the native shell points to the deployed server. `capacitor.config.ts` is configured for the current production URL:
```ts
server: {
  url: 'https://chores.ashbi.ca',
  androidScheme: 'https'
}
```

Do not remove the hosted URL or replace it with a static `out/` build: this app is server-rendered and does not support a static export.

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
The native icon and splash resources are already checked in under `android/` and `ios/`. If they need to be regenerated, install the Capacitor asset generator separately and review its output before committing; it is not part of the production dependency set.

## 5. Native Features
You can now use Capacitor plugins to access native hardware (Camera, Notifications, Biometrics, etc.).
Example:
```bash
npm install @capacitor/camera
```
Then use it in your code just like a regular npm package!
