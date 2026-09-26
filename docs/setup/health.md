# Apple Health and Health Connect setup

The app code is done: users connect in onboarding or Profile → Health apps. DietBuddy then:

- **reads** weight (imported into the weight trend), body fat, steps and active energy (shown on Home, never added to the calorie target) and water;
- **writes** the weight from check-ins and each glass of water.

Scales and wearables (Withings, Garmin, Fitbit, Oura, WHOOP, Samsung…) arrive through these stores; there are no per-device integrations (CLAUDE.md §7.12).

No new accounts are needed beyond the Apple Developer and Google Play accounts from `docs/setup/revenuecat.md`. Health data only works in a development or store build on a real phone.

## iOS (HealthKit)

1. Nothing to configure by hand. The `@kingstinct/react-native-healthkit` config plugin adds the HealthKit entitlement and the permission texts, and EAS Build enables the HealthKit capability on the App ID when it builds.
2. App Store Connect → **App Privacy**: declare "Health & Fitness → Health" and "Fitness" data, linked to the user, used for App Functionality, **not** for tracking or advertising.
3. App Review requires your privacy policy to explain the HealthKit use (read weight, body fat, steps, active energy, water; write weight and water; never sold or used for ads). Apple rejects apps that store HealthKit data in iCloud or use it for ads; DietBuddy does neither.
4. Test: build with `npx eas build --profile development --platform ios`, open Profile → Health apps → Connect, allow the categories, add a weight in the Health app, and tap **Sync now**. It appears in Progress with source `healthkit`.

## Android (Health Connect)

1. The `react-native-health-connect` plugin adds the permission-rationale screen, `app.json` lists the exact permissions, and `expo-build-properties` sets minSdk 26 (required by Health Connect).
2. Health Connect is built in on Android 14+. On Android 9–13, users install **Health Connect** from Google Play; the app says so if it's missing.
3. **Google Play Console → App content → Health apps**: complete the declaration, and fill in the **Health Connect permissions** form for each permission (read weight, body fat, steps, active calories and hydration; write weight and hydration) with the reason shown to users. Google reviews this before production release, so submit early.
4. Data safety form: "Health and fitness" data collected, not shared, not used for ads.
5. Test: install a development build, open Health Connect, add a weight entry, then Profile → Health apps → Connect → Sync now.

## What's stored

Imported weights become `body_metrics` rows with `source` `healthkit` or `health_connect`; the connection is a `device_connections` row. Steps and active energy are read live and not stored. Disconnecting in the app stops syncing; revoking access is done in the Health app or Health Connect.
