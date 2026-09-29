# Crash reporting (Sentry) and analytics (PostHog)

Both are optional: without their keys the app sends nothing. Use EU regions (the Privacy Policy
says so).

## Sentry (crash reports)

1. Sign up at https://sentry.io and choose the **EU (Frankfurt)** data region.
2. Create a project: platform **React Native**, name `dietbuddy`.
3. Copy the **DSN** (Project settings → Client Keys), e.g. `https://…@o123.ingest.de.sentry.io/456`.
4. Add it to `.env` and to the EAS environments (preview and production):
   ```
   npx eas-cli env:create --environment preview --name EXPO_PUBLIC_SENTRY_DSN --value "https://..." --visibility plaintext
   npx eas-cli env:create --environment production --name EXPO_PUBLIC_SENTRY_DSN --value "https://..." --visibility plaintext
   ```
5. Rebuild. Crash reports start with the next build (never in development).

What is sent: the error, stack trace, app version and device model. No user ID, email, request
bodies or health data (`src/lib/telemetry/crash.ts` removes them). Users can switch reports off
in Profile → Privacy & Data → Crash reports.

Readable stack traces (optional): add `SENTRY_AUTH_TOKEN` as an EAS secret and the
`@sentry/react-native/expo` config plugin with your organization and project to upload source maps.

## PostHog (analytics)

1. Sign up at https://eu.posthog.com (**EU cloud**).
2. Create a project and copy the **Project API key** (`phc_…`).
3. Add `EXPO_PUBLIC_POSTHOG_KEY` like the DSN above (both environments) and rebuild.

Events are only sent while the user has the **analytics** consent on (Privacy & Data). They use a
random ID per installation (reset on sign-out) and never contain health values, food names or
typed text. Events: `app_open`, `onboarding_step`, `onboarding_completed`, `paywall_viewed`
(feature, welcome), `purchase_started` / `purchase_completed` / `purchase_cancelled` /
`purchase_failed`, `food_logged` (source), `meal_plan_action`, `coach_message_sent` (persona).

Useful PostHog funnel: `onboarding_completed` → `paywall_viewed` → `purchase_completed`.
