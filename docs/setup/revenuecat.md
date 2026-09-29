# Subscriptions setup (RevenueCat, App Store, Google Play)

The app code is done: paywall, restore, entitlement check and the `revenuecat-webhook` Edge Function. These steps connect it to real stores. Prices live in the stores, never in the app.

You need:

- **Apple Developer Program** membership ($99/year): https://developer.apple.com/programs/enroll/
- **Google Play Console** account ($25 one-time): https://play.google.com/console/signup
- **RevenueCat** account (free until $2.5k monthly revenue): https://app.revenuecat.com/signup
- An **Expo** account for EAS builds (free): https://expo.dev/signup

Store products can only be tested in a development build installed from EAS, not in Expo Go or the web build. Before the store accounts exist, RevenueCat's Test Store key lets you try the paywall (see "Before the stores" below).

## 1. Create the apps in the stores

**App Store Connect** (https://appstoreconnect.apple.com) → Apps → **+** → New App

- Platform iOS, name "DietBuddy", bundle ID `com.com2go.dietbuddy` (register it first under Certificates, Identifiers & Profiles → Identifiers if it isn't listed), SKU `dietbuddy`.
- Agreements, Tax, and Banking: accept the **Paid Apps** agreement and add bank/tax details. Subscriptions can't be tested until this is active.

- App Information / version page URLs: Privacy Policy `https://dietbuddy.me/privacy.html`, Support URL and Marketing URL `https://dietbuddy.me` (see `docs/store/README.md`).

**Google Play Console** → Create app → "DietBuddy", app, free (in-app purchases are still allowed), package `com.com2go.dietbuddy`.

- Store settings → Store listing contact details: website `https://dietbuddy.me`; App content → Privacy policy `https://dietbuddy.me/privacy.html`; Data safety → delete account URL `https://dietbuddy.me/delete-account.html`.
- Google only lets you create subscriptions after an app build with the billing library has been uploaded. Upload the first EAS Android build to the **Internal testing** track (step 5), then continue with step 2.

## 2. Create the products

Use the same product IDs in both stores so RevenueCat maps them easily.

| Plan    | Type                                                       | Product ID                  | Price (CLAUDE.md §12) |
| ------- | ---------------------------------------------------------- | --------------------------- | --------------------- |
| Monthly | Auto-renewable subscription, 1 month, **7-day free trial** | `dietbuddy_premium_monthly` | $9.99                 |
| Annual  | Auto-renewable subscription, 1 year                        | `dietbuddy_premium_annual`  | $71.88                |

- **Apple**: App → Monetization → Subscriptions → create a subscription group "Premium", add Monthly and Annual (with the 7-day free introductory offer on Monthly).
- **Google**: Monetize → Products → Subscriptions → create `dietbuddy_premium_monthly` with a base plan and a **free trial offer** (7 days), and `dietbuddy_premium_annual`.

There is no Lifetime plan (decision log 2026-09-28); the app ignores one if it is ever added.

## 3. Configure RevenueCat

1. Create a project "DietBuddy".
2. **Apps**: add an App Store app (bundle ID, plus an **In-App Purchase key** from App Store Connect → Users and Access → Integrations → In-App Purchase) and a Play Store app (package name, plus a **service account JSON** with Play Console financial access; RevenueCat's guide walks through it).
3. **Products**: import the two products from both stores.
4. **Entitlements**: create one entitlement with identifier **`premium`** and attach both products.
5. **Offerings**: create the default offering with packages **Monthly** (`$rc_monthly`) and **Annual** (`$rc_annual`). The app reads the package types to label plans.
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

## Before the stores: RevenueCat Test Store

RevenueCat's **Test Store** key (starts with `test_`, RevenueCat → Project → API keys) lets you
try the paywall without App Store or Play accounts: purchases are simulated by RevenueCat. The
app takes one key per platform, so put the same `test_` key in both:

```
EXPO_PUBLIC_REVENUECAT_IOS_KEY=test_...
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=test_...
```

1. In RevenueCat, open the **Test Store** app and add two products (monthly and annual), attach
   them to the `premium` entitlement and put them in the default offering as `$rc_monthly` and
   `$rc_annual` (step 3.4–3.5), so the paywall has plans to show.
2. Use the key in `.env` and in the EAS **development** and **preview** environments only. It
   must never reach a store build: set the **production** environment to the `appl_...` and
   `goog_...` keys from step 3.6. As a safeguard, release builds (TestFlight, the stores) ignore
   `test_` keys, so TestFlight purchases need the real `appl_...` key (Apple's sandbox makes them
   free).
3. Test Store purchases still need a development build (not the web build). The webhook works
   the same way (step 4) if you want to see `is_premium` change on the server.

**Instant unlock (recommended):** also create a RevenueCat **secret** API key (Project settings →
API keys → + New secret key, v1 permissions) and store it as a Supabase secret:
`npx supabase secrets set REVENUECAT_SECRET_KEY=sk_...`, then
`npx supabase functions deploy sync-premium`. The app calls it right after a purchase or restore,
so Premium features that the server checks unlock at once instead of after the webhook.

## 5. Test with sandbox purchases

1. `npx eas login`, then `npx eas build --profile development --platform ios` (and `android`). EAS asks to create certificates and a keystore; accept.
2. iOS: create a **Sandbox tester** in App Store Connect → Users and Access → Sandbox, sign in with it on the device under Settings → App Store → Sandbox Account. Android: add your Google account under Play Console → Settings → **License testing**, and join the internal testing track.
3. Open the paywall (Home → Subscribe, Profile → Upgrade, or the coach limit link), buy a plan, and check:
   - the paywall switches to "You're Premium",
   - RevenueCat → Customers shows the purchase under your Supabase user ID,
   - `profiles.is_premium` becomes `true` (Supabase → Table editor),
   - the coach no longer shows the daily limit.
4. Restore purchases after reinstalling the app (Profile → Restore purchases).

## 6. Test Premium on TestFlight (Apple sandbox)

TestFlight builds always buy in Apple's **sandbox**: you sign in with your normal Apple ID, nothing
is charged, and subscriptions renew quickly and then stop, so you can test expiry too. What the
build needs:

1. Steps 1–3 done for Apple: Paid Apps agreement **Active**, the two subscriptions created (status
   "Ready to Submit" is enough for sandbox), RevenueCat's App Store app with its In-App Purchase
   key, the `premium` entitlement and the default offering.
2. The `appl_...` key in the EAS environment the `testflight` profile uses (**preview**):
   ```
   npx eas-cli env:create --environment preview --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value appl_... --visibility plaintext
   ```
   (If a `test_...` value is already there, use `env:update` instead; release builds ignore
   `test_` keys, and the paywall then says subscriptions aren't switched on in this version.)
3. The webhook (step 4), so server-checked Premium features (unlimited coach, extra meal ideas,
   Grocery, Restaurant, AI insights, body scan) unlock too. Sandbox events are applied like real
   ones, so the TestFlight account becomes Premium on the live project; that's intended for
   testing.
4. A new build: `npx eas-cli build --platform ios --profile testflight --auto-submit`.

Then open any Premium feature (every one leads to the paywall), buy, and check the list in step
5.3. The Apple sheet says "[Environment: Sandbox]". Cancel under Settings → Apple ID →
Subscriptions (TestFlight subscriptions show there) or let it expire.

**Quick test without buying**: in Supabase → Table editor → `profiles`, set `is_premium` to
`true` on your row. The app treats that as Premium everywhere (server and device). A later
webhook event for that user overwrites it.

## Store review checklist

- The paywall states the price, period, trial length and that it renews automatically (done in code).
- Terms and Privacy links on the paywall open https://dietbuddy.me/terms.html and https://dietbuddy.me/privacy.html; both stores require them. In App Store Connect, also put the Terms URL under App Information → License Agreement (custom EULA) or in the app description, as Apple asks for subscriptions.
- Features marked "Coming to Premium" must not be described as included in store listings until they ship.
