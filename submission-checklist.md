# ChoreChamps — App Store Submission Checklist
## Apple App Store + Google Play Store
### For Cam — step by step, tick each box

---

## Pre-Submission Setup

- [ ] **App bundle ready** — bundle ID `com.chorechamps.app`, web directory `out/` built
- [x] **Privacy policy URL live** — https://chores.ashbi.ca/privacy-policy (verified HTTP 200)
- [ ] **Screenshots prepared** — 6.7" iPhone (393×852) and 6.5" iPhone (428×926) for Apple; 16:9 for Google
- [ ] **App icon ready** — 1024×1024 PNG for Apple; 512×512 PNG for Google
- [ ] **Category set** — Lifestyle / Family (both stores)
- [ ] **Price set** — $1.99 USD, one-time purchase, no subscription
- [ ] **Content rating filled out** — both stores require a content rating questionnaire
- [ ] **Age rating** — 4+ (Apple), Everyone (Google)
- [ ] **"Made for Kids" answered** — Yes (Apple App Store Connect requires this for apps that may have children as end users)

---

## Apple App Store Submission

### 1. App Store Connect — Create New App

- [ ] Log in to App Store Connect → My Apps → "+" → "New App"
- [ ] Platforms: **iOS** checked
- [ ] Name: `ChoreChamps`
- [ ] Primary Language: English
- [ ] Bundle ID: `com.chorechamps.app`
- [ ] SKU: `chorechamps-v1` (or similar)
- [ ] User Access: Full access

### 2. Pricing and Availability

- [ ] Price: $1.99 USD
- [ ] Availability: All territories (or select specific ones)

### 3. Metadata

- [ ] **Subtitle:** `Kids chores, points & rewards — together.`
- [ ] **Description:** paste from store-listing.md (long description field)
- [ ] **Keywords:** paste from store-listing.md keywords list
  - `chore tracker,kids chore app,chore chart,points for kids,reward system,allowance tracker,family tasks,kids rewards,task manager for kids,chores list,responsibility tracker,kids habit tracker`
- [ ] **Promotional Text:** (optional — summarize main value prop: "Assign chores, earn points, claim rewards. One $1.99 purchase.")
- [ ] **What's New:** paste v1.0 "What's New" text from store-listing.md
- [x] **Privacy Policy URL:** https://chores.ashbi.ca/privacy-policy
- [ ] **Support URL:** `https://chores.ashbi.ca`
- [ ] **Marketing URL:** (optional)
- [ ] **Category:** Primary: Lifestyle, Secondary: (none required)
- [ ] **"Made for Kids":** Yes — this app has children as end users

### 4. Screenshots

- [ ] iPhone 6.7" Display (393×852) — minimum 5 screenshots
- [ ] iPhone 6.5" Display (428×926) — minimum 5 screenshots

Screenshots should show: parent dashboard (chore creation/approval), kid dashboard (chore list, points), rewards store, badge/achievement screen.

### 5. App Icon

- [ ] 1024×1024 App Store icon (ChoreChamps shield/trophy)

### 6. Build Upload

- [ ] Build web app: `npm run build`
- [ ] Sync to iOS: `npx cap sync ios`
- [ ] Open `ios/` folder in Xcode
- [ ] Archive build with correct bundle ID and version
- [ ] Upload to App Store Connect — should appear under the app's "Builds" section
- [ ] Select the new build in the app's "Build" dropdown

### 7. App Review Section

- [ ] Signatures: confirm all required signatures are set
- [ ] Export Compliance: answer based on whether you use any regulated cryptography (HTTPS only — answer No unless you use something specific)
- [ ] Content Rights: confirm you own all content
- [ ] Ad ID: confirm not used (no third-party ad SDKs)
- [ ] **"Made for Kids":** Ensure this is set to YES — required for apps accessed by children

### 8. Submit for Review

- [ ] Click "Add for Review"
- [ ] Confirm all sections are complete (no missing indicators)
- [ ] Submit

**Review time:** Typically 24–72 hours.

---

## Google Play Store Submission

### 1. Google Play Console — Create App

- [ ] Log in to Google Play Console → All Apps → "Create App"
- [ ] App name: `ChoreChamps`
- [ ] Default language: English (US)
- [ ] App type: App (not game)
- [ ] Free or Paid: Paid (checked), price $1.99 USD

### 2. App Signing

- [ ] Decide whether to use Play App Signing (Google recommends yes)
- [ ] Opt in or out accordingly

### 3. Store Listing

- [ ] **Short Description:** `Gamified chore tracker for kids. Assign tasks, earn points, claim rewards — no subscriptions.`
- [ ] **Full Description:** paste from store-listing.md (Google long description)
- [ ] **Feature Graphic:** 1024×500 PNG
- [ ] **App Icon:** 512×512 PNG
- [ ] **Screenshots:** minimum 2 screenshots (phone + tablet)
  - Phone: 16:9 (e.g., 1920×1080)
  - Tablet: 7"–20" (e.g., 2048×1536)

### 4. Categorization

- [ ] Category: Lifestyle
- [ ] Tags: (optional) kids, chores, family, rewards, points, parenting

### 5. Content Rating

- [ ] Go to Content Rating → complete questionnaire
- [ ] **App access:** Contains a child-directed interface — answer accordingly
- [ ] Answer all questions truthfully — ChoreChamps is not a medical device and makes no claims
- [ ] Submit rating

### 6. Pricing and Distribution

- [ ] Price: $1.99 USD
- [ ] Countries: All countries (or select specific ones)
- [ ] Distribution: opt in or out of "Include in automatic updates" as preferred

### 7. Privacy Policy

- [x] Privacy Policy URL field: https://chores.ashbi.ca/privacy-policy
- [x] Confirm you have a live, publicly accessible privacy policy

### 8. Ads Declaration

- [ ] Is your app an ads app? → **No**
- [ ] Does your app contain ads? → **No**

### 9. Data Safety (Google Play)

- [ ] Complete the Data Safety form in Play Console
- [ ] Check boxes honestly: app does not collect location, does not collect biometric data, etc.
- [ ] No data shared with third parties for marketing
- [ ] Children's data section: confirm data is parent-controlled, no third-party behavioral advertising

### 10. Upload APK / AAB

- [ ] Build release APK or AAB: `npm run build && npx cap sync android`
- [ ] Open Android studio, build release APK/AAB
- [ ] Upload to Play Console under "Production" → "Create Release"
- [ ] Add the new build, review release notes, save
- [ ] If using a signing key, confirm key config

### 11. Submit for Review

- [ ] Click "Review Release"
- [ ] Confirm all sections complete
- [ ] Click "Approve and rollout to Production"

**Review time:** Typically 1–7 days for new apps; updates may be faster.

---

## Post-Submission

- [ ] Check for review status daily
- [ ] If rejected: read reason carefully, fix, resubmit
- [ ] If approved: confirm app appears in store with correct name, price, and screenshots
- [ ] Test purchase flow (sandbox test if possible) to confirm $1.99 one-time purchase works
- [ ] Verify privacy policy URL is live and accessible from store listing
- [ ] Check that "Made for Kids" is reflected correctly in the App Store listing

---

## COPPA / Kids Category Checklist

Before submitting to either store, confirm:

- [ ] Privacy policy is live at a public URL
- [ ] Privacy policy explicitly covers children under 13 and parental data rights
- [ ] No third-party behavioral advertising in the app
- [ ] No data collection from children beyond what the parent has configured
- [ ] Parent can delete child profile and all associated data at any time
- [ ] No in-app purchases that charge the child's account — only parent-controlled rewards

---

## Quick Reference

| Item | Apple | Google |
|---|---|---|
| Bundle/Package | com.chorechamps.app | com.chorechamps.app |
| Price | $1.99 USD | $1.99 USD |
| Category | Lifestyle / Family | Lifestyle / Family |
| Privacy Policy URL | Required | Required |
| Screenshots | 6.7" + 6.5" iPhone | 16:9 phone + tablet |
| App Icon | 1024×1024 | 512×512 |
| "Made for Kids" | Yes | N/A (but Data Safety section) |
| Review Time | 24–72 hrs | 1–7 days |
| Build Method | `npm run build && cap sync ios` → Xcode archive | `npm run build && cap sync android` → Android Studio |

---

*Submission checklist for ChoreChamps v1.0 — bundle com.chorechamps.app*
