# Authentication

Sign-up and sign-in are built in `src/features/auth` on Supabase Auth.

- **Email or phone + password.** On sign-up the user chooses Email or Phone. The account is verified with a 6-digit code (email or SMS), typed into the app.
- **Apple** (iOS) and **Google**, using the native SDKs and `signInWithIdToken`. These accounts are already verified by the provider.
- **Date of birth at sign-up.** The app blocks under-18s. The database also rejects them when the account is created (`handle_new_user` → age-gate trigger), so the rule holds even if someone calls the API directly. Apple and Google users give their birth date in onboarding.
- **Forgot password.** A code is sent by email (recovery template) or SMS. Entering it leads to a "choose a new password" screen.

Routing follows the session (`app/_layout.tsx`):

- Signed out: only `(auth)` screens are reachable.
- A reset code accepted: only `/new-password`.
- Signed in: the app.

## Owner setup (hosted Supabase project)

Do these once the project exists (see `docs/backend.md`). Items 1–2 are needed before anyone can sign up. The rest can follow.

### 1. Email (required)

- **Authentication → Providers → Email**: enabled, **Confirm email** on, OTP length **6**.
- **Authentication → Email Templates**: paste `supabase/templates/confirmation.html` into _Confirm signup_ and `supabase/templates/recovery.html` into _Reset password_. They send a code, not a link.
- **Project Settings → Authentication → SMTP**: use **Brevo** (decision log 2026-09-28); steps in `docs/setup/email-sms.md`. Supabase's built-in email only reaches your own team and is heavily rate-limited, so real users won't get codes without this.
- **Authentication → URL Configuration**: Site URL `dietbuddy://`, redirect URLs `dietbuddy://**`.

### 2. Phone / SMS (optional, has running costs)

- **Authentication → Providers → Phone**: enable and turn on **Confirm phone**. Codes are sent by **sms.to** through the `send-sms` Edge Function (a Send SMS hook), not a built-in provider; steps in `docs/setup/email-sms.md`. Each code is a paid SMS.
- In the app's `.env`: `EXPO_PUBLIC_AUTH_PHONE_ENABLED=true`. Until then the Email/Phone switch is hidden.

### 2a. Bot protection (CAPTCHA and SMS guard)

- **CAPTCHA (Cloudflare Turnstile, free):** in Cloudflare → Turnstile, add a widget (mode _Managed_) with the hostnames `dietbuddy.me` (the phone app's check runs as if on the website) and your web build's domain. Put the **site key** in `EXPO_PUBLIC_TURNSTILE_SITE_KEY` (EAS environment variables) and the **secret key** in Supabase **Authentication → Attack Protection → Enable Captcha protection** (provider Turnstile). Do both in the same release: with the secret set and an app build without the site key, password sign-in, sign-up and codes fail with "The security check didn’t finish". The check covers sign-up, password sign-in, code resends and password resets (`src/lib/captcha`); it is invisible unless Cloudflare wants an interaction. After enabling, test Apple and Google sign-in once on a real device.
- **SMS guard (always on):** `send-sms` only texts the calling codes in `app_config.sms_guard` (EU/EEA, UK, Switzerland) and caps codes per number (3 an hour, 6 a day) and overall (300 an hour, 2,000 a day); all editable in Admin → Settings. Over a cap the app says "Too many attempts"; other countries are told to use email. The counters store an HMAC of the number (keyed with the hook secret), never the number. If the counters can't be reached, no SMS is sent (fails closed).
- Supabase's own limits (**Authentication → Rate Limits**) still apply on top; keep _SMS sent per hour_ near the guard's hourly cap.

### 3. Sign in with Apple (iOS)

- Needs an Apple Developer account. In **Certificates, Identifiers & Profiles**, enable _Sign in with Apple_ on the App ID `com.com2go.dietbuddy`.
- Supabase **Authentication → Providers → Apple**: enable and add `com.com2go.dietbuddy` under _Client IDs_. The native flow needs no secret key.
- The button shows only on iOS devices that support it. Apple requires it on iOS whenever Google sign-in is offered.

### 4. Google

- In Google Cloud, set up the OAuth consent screen, then create three OAuth clients:
  - **Web**: used by Supabase.
  - **iOS**: bundle ID `com.com2go.dietbuddy`.
  - **Android**: package `com.com2go.dietbuddy`, with the SHA-1 fingerprint from `npx eas-cli credentials`.
- Supabase **Authentication → Providers → Google**: enable, add the web client ID and secret, add the iOS client ID under _Authorized Client IDs_, and turn on _Skip nonce check_ (required for the iOS SDK).
- In `.env`: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, and `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` (the reversed iOS client ID, e.g. `com.googleusercontent.apps.123-abc`). The button appears once these are set, in a development or production build (not Expo Go).

### 5. Legal links

"Terms of Service" and "Privacy Policy" on the sign-up screen (and in onboarding, Profile and the paywall) open https://dietbuddy.me/terms.html and https://dietbuddy.me/privacy.html (`src/lib/site.ts`). `EXPO_PUBLIC_TERMS_URL` and `EXPO_PUBLIC_PRIVACY_URL` override them, e.g. for a staging site. Both pages must be live before store submission: upload `landing/` (see `landing/README.md`).

## Local development

`npm run db:start` runs Auth locally with the same settings from `supabase/config.toml`:

- Codes are sent as emails you can read in the local mail viewer that `supabase start` prints (Mailpit).
- The test phone number `+44 7700 900123` always accepts code `123456`, and no SMS is sent.
