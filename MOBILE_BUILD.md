# SiteRun on Android and iOS

The apps are the same web app inside Capacitor 6: one codebase, no second UI. This file
covers running them, the device features they use, and what each store needs.

- App ID: `au.com.siterun.app`
- App name: SiteRun
- Web build copied into the apps: `dist/`
- Deep link scheme: `au.com.siterun.app://` (sign-in and email links)

## Every time you change the app

```bash
npm run build
npx cap sync
```

`build` compiles the web app; `sync` copies it into `android/` and `ios/` and updates the
native plugins. Run `npx cap sync` after installing any Capacitor plugin.

## Android

### What you need

- Android Studio (includes the Android SDK and an emulator)
- JDK 17 (Android Studio ships one; Gradle here needs 17, not a newer JDK)

### Run on the emulator

1. Open Android Studio → **More Actions → Virtual Device Manager** → create a Pixel device with API 34.
2. From the project folder:
   ```bash
   npm run build
   npx cap sync android
   npx cap open android
   ```
3. In Android Studio pick the emulator and press **Run**. Or, with the emulator already running:
   ```bash
   npx cap run android
   ```

### Run on a real phone

1. On the phone: **Settings → About phone → tap Build number seven times**, then **Developer options → USB debugging**.
2. Plug it in, accept the prompt, then `npx cap run android --target <device-id>` (list devices with `adb devices`).

### Release build (Play Store)

1. Create a keystore once:
   ```bash
   keytool -genkey -v -keystore siterun-release.jks -alias siterun -keyalg RSA -keysize 2048 -validity 10000
   ```
   Keep the file and passwords out of the repository.
2. In `android/key.properties` (git-ignored) put:
   ```
   storeFile=../siterun-release.jks
   storePassword=…
   keyAlias=siterun
   keyPassword=…
   ```
3. Build the bundle:
   ```bash
   cd android && ./gradlew bundleRelease
   ```
   The result is `android/app/build/outputs/bundle/release/app-release.aab`.

## iOS

Needs a Mac with Xcode; iOS apps can't be built on Windows.

### What you need

- Xcode 15 or newer, plus the iOS simulator
- CocoaPods (`sudo gem install cocoapods`)
- An Apple Developer account for devices and the App Store

### Run on the simulator

```bash
npm run build
npx cap sync ios
cd ios/App && pod install && cd ../..
npx cap open ios
```

In Xcode choose a simulator (for example iPhone 15) and press **Run**, or use `npx cap run ios`.

### Run on a real iPhone

1. In Xcode open **App → Signing & Capabilities**, choose your team; Xcode manages the provisioning profile.
2. Plug the phone in, select it as the destination, press **Run**. On the phone approve the developer certificate under **Settings → General → VPN & Device Management**.

### Release build (App Store)

1. In Xcode set the destination to **Any iOS Device**, then **Product → Archive**.
2. In the Organiser choose **Distribute App → App Store Connect**.

## Icons and splash screens

Sources are generated from `public/brand/app-icon.svg` and the white mark:

```bash
npm run native:assets
```

This writes `assets/` (icon and splash sources) and then generates every Android and iOS
size. The splash is the mark centred on navy `#0B1F44`.

## Device features

| Feature                      | Where it's used                           | Permission           |
| ---------------------------- | ----------------------------------------- | -------------------- |
| Camera / photo library       | Machine photos, document scans            | Camera, Photos       |
| Location                     | "Use my location" on the site map         | Location when in use |
| Filesystem                   | Invoices and statements save to Documents | —                    |
| Haptics                      | Success and error feedback                | —                    |
| Status bar, splash, keyboard | App chrome                                | —                    |
| Back button (Android)        | Closes sheets, then goes back, then exits | —                    |
| Deep links                   | Sign-in and email links                   | —                    |
| Push notifications           | Off unless `VITE_PUSH_ENABLED=true`       | Notifications        |

## Sign-in inside the apps

- Email and password work with no extra setup.
- Google and Apple open the system browser and return to `au.com.siterun.app://login`.
- Email verification and password reset links return to `au.com.siterun.app://verify` and `://reset-password`.

Add all three to **Supabase → Authentication → URL configuration → Redirect URLs**:

```
au.com.siterun.app://login
au.com.siterun.app://verify
au.com.siterun.app://reset-password
```

Apple also requires "Sign in with Apple" in an app that offers other social logins.

## Push notifications (optional, off by default)

Registering for push without the platform credentials crashes on Android, so it only runs
when `VITE_PUSH_ENABLED=true`.

1. **Android:** create a Firebase project, add an Android app with ID `au.com.siterun.app`, download `google-services.json` into `android/app/`.
2. **iOS:** in the Apple Developer portal enable Push Notifications for the App ID, create an APNs key, and upload it to Firebase.
3. Set `VITE_PUSH_ENABLED=true`, rebuild, and `npx cap sync`.
4. Device tokens are stored in the `push_tokens` table. Sending still needs a server piece (a Supabase Edge Function calling FCM) — not built yet.

## Store checklists

### Google Play

- Signed `.aab` from `bundleRelease`
- App icon 512×512, feature graphic 1024×500
- Phone screenshots (at least 2; 1080×1920 works) — the app's own screens
- Short description (80 characters) and full description
- Privacy policy URL — the deployed `/privacy` page
- Data safety form: account details, location, photos, and why each is collected
- Content rating questionnaire, target audience (business users, 18+)
- Permissions: camera, location, notifications — explain each in the listing

### Apple App Store

- Archive uploaded through Xcode
- App icon 1024×1024 (no transparency, no rounded corners)
- Screenshots for 6.7" and 6.5" iPhones
- Privacy policy URL and App Privacy answers matching the permissions above
- Demo account for review (the seeded contractor login works)
- "Sign in with Apple" if Google sign-in is enabled
- Export compliance: no non-exempt encryption (already set in `Info.plist`)

## Known limits

- Push sending isn't implemented; registration and token storage are.
- Payments are mocked, so the stores' in-app purchase rules don't apply. Real card payments through Stripe are outside the app stores' IAP rules because they pay for physical equipment hire.
- The apps were built and verified here, but not run on an emulator or device: this machine has no Android SDK and iOS needs a Mac.
