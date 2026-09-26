# Subscriptions setup (RevenueCat, App Store, Google Play)

The app code is done: paywall, restore, entitlement check and the `revenuecat-webhook` Edge Function. These steps connect it to real stores. Prices live in the stores, never in the app.

You need:

- **Apple Developer Program** membership ($99/year): https://developer.apple.com/programs/enroll/
- **Google Play Console** account ($25 one-time): https://play.google.com/console/signup
- **RevenueCat** account (free until $2.5k monthly revenue): https://app.revenuecat.com/signup
- An **Expo** account for EAS builds (free): https://expo.dev/signup

Store products can only be tested in a development build installed from EAS, not in Expo Go or the web build.

## 1. Create the apps in the stores

**App Store Connect** (https://appstoreconnect.apple.com) → Apps → **+** → New App

- Platform iOS, name "DietBuddy", bundle ID `com.com2go.dietbuddy` (register it first under Certificates, Identifiers & Profiles → Identifiers if it isn't listed), SKU `dietbuddy`.
- Agreements, Tax, and Banking: accept the **Paid Apps** agreement and add bank/tax details. Subscriptions can't be tested until this is active.

**Google Play Console** → Create app → "DietBuddy", app, free (in-app purchases are still allowed), package `com.com2go.dietbuddy`.

- Google only lets you create subscriptions after an app build with the billing library has been uploaded. Upload the first EAS Android build to the **Internal testing** track (step 5), then continue with step 2.

## 2. Create the products

Use the same product IDs in both stores so RevenueCat maps them easily.

| Plan     | Type                                                       | Product ID                   | Price (CLAUDE.md §12) |
| -------- | ---------------------------------------------------------- | ---------------------------- | --------------------- |
| Monthly  | Auto-renewable subscription, 1 month, **7-day free trial** | `dietbuddy_premium_monthly`  | $9.99                 |
| Annual   | Auto-renewable subscription, 1 year                        | `dietbuddy_premium_annual`   | $71.88                |
| Lifetime | Non-consumable (Apple) / One-time product (Google)         | `dietbuddy_premium_lifetime` | $149                  |

- **Apple**: App → Monetization → Subscriptions → create a subscription group "Premium", add Monthly and Annual (with the 7-day free introductory offer on Monthly). Lifetime: Monetization → In-App Purchases → Non-Consumable.
- **Google**: Monetize → Products → Subscriptions → create `dietbuddy_premium_monthly` with a base plan and a **free trial offer** (7 days), and `dietbuddy_premium_annual`. Lifetime: Monetize → Products → In-app products.

Lifetime is still an open decision (CLAUDE.md §17.8). If you drop it, just don't create it; the paywall only shows what the store offers.

## 3. Configure RevenueCat

1. Create a project "DietBuddy".
2. **Apps**: add an App Store app (bundle ID, plus an **In-App Purchase key** from App Store Connect → Users and Access → Integrations → In-App Purchase) and a Play Store app (package name, plus a **service account JSON** with Play Console financial access; RevenueCat's guide walks through it).
3. **Products**: import the three products from both stores.
4. **Entitlements**: create one entitlement with identifier **`premium`** and attach all three products.
5. **Offerings**: create the default offering with packages **Monthly** (`$rc_monthly`), **Annual** (`$rc_annual`) and **Lifetime** (`$rc_lifetime`). The app reads the package types to label plans.
6. **API keys**: copy the **public** Apple and Google SDK keys into `.env` and into the EAS environment variables:
   ```
   EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_...
   EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_...
   ```
   (Public SDK keys are designed to ship in apps. Never put the secret API key in the app.)

## 4. Connect the webhook (sets `is_premium` on the server)

1. Pick a long random secret, e.g. `openssl rand -hex 32`.
2. Store it in Supabase: `npx supabase secrets set REVENUECAT_WEBHOOK_AUTH="Bearer <secret>"`
3. Deploy: `npx supabase functions deploy revenuecat-webhook` (it runs without a Supabase JWT; see `supabase/config.toml`).
4. RevenueCat → Project settings → **Integrations → Webhooks** → add:
   - URL: `https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook`
   - Authorization header value: `Bearer <secret>` (exactly what you stored)
   - Send a **test event**; the function answers `{ "ok": true }`.

The app logs RevenueCat in with the Supabase user ID, so webhook events map directly to `profiles.user_id`. Out-of-order events are ignored (`profiles.premium_event_at`).

## 5. Test with sandbox purchases

1. `npx eas login`, then `npx eas build --profile development --platform ios` (and `android`). EAS asks to create certificates and a keystore; accept.
2. iOS: create a **Sandbox tester** in App Store Connect → Users and Access → Sandbox, sign in with it on the device under Settings → App Store → Sandbox Account. Android: add your Google account under Play Console → Settings → **License testing**, and join the internal testing track.
3. Open the paywall (Home → Subscribe, Profile → Upgrade, or the coach limit link), buy a plan, and check:
   - the paywall switches to "You're Premium",
   - RevenueCat → Customers shows the purchase under your Supabase user ID,
   - `profiles.is_premium` becomes `true` (Supabase → Table editor),
   - the coach no longer shows the daily limit.
4. Restore purchases after reinstalling the app (Profile → Restore purchases).

## Store review checklist

- The paywall states the price, period, trial length and that it renews automatically (done in code).
- Terms and Privacy links appear on the paywall when `EXPO_PUBLIC_TERMS_URL` / `EXPO_PUBLIC_PRIVACY_URL` are set; both stores require them.
- Features marked "Coming to Premium" must not be described as included in store listings until they ship.
