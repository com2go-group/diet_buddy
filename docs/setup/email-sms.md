# Email (Brevo) and SMS (sms.to)

Owner decisions 2026-09-28: verification and password-reset emails go through **Brevo**; SMS codes go through **sms.to**, with no app-side cap. The SMS provider and sender name are settings (`app_config`) the admin dashboard can change later.

## 1. Brevo (email)

1. Create an account at [brevo.com](https://www.brevo.com) (EU company; data in the EU).
2. **Senders, Domains & Dedicated IPs → Domains**: add your domain and publish the DKIM and DMARC DNS records Brevo shows, then verify. Without this, codes land in spam.
3. **Senders**: add `no-reply@yourdomain.com` (or similar).
4. **SMTP & API → SMTP**: note the **login** and create an **SMTP key**.
5. Supabase **Project Settings → Authentication → SMTP Settings**: enable custom SMTP.
   - Host `smtp-relay.brevo.com`, port `587`.
   - Username: the Brevo SMTP login. Password: the SMTP key.
   - Sender email: the address from step 3. Sender name: `DietBuddy`.
6. **Authentication → Rate Limits**: raise "emails sent per hour" to what you expect at launch (Brevo's free plan allows 300 emails a day; upgrade when needed).
7. Test: sign up with a real address and check the 6-digit code arrives.

## 2. sms.to (SMS)

1. Create an account at [sms.to](https://sms.to), add credit, and create an **API key** (Settings → API Keys).
2. Sender ID: register `DietBuddy` (some countries need pre-registration; others show a number instead).
3. Deploy the hook function and set its secrets:
   ```bash
   npx supabase functions deploy send-sms --no-verify-jwt
   npx supabase secrets set SMSTO_API_KEY=...
   ```
4. Supabase **Authentication → Hooks → Send SMS hook**: choose **HTTPS**, URL `https://<project-ref>.supabase.co/functions/v1/send-sms`, then **Generate secret**. Copy it and set it:
   ```bash
   npx supabase secrets set SEND_SMS_HOOK_SECRET='v1,whsec_...'
   ```
5. **Authentication → Providers → Phone**: enable, **Confirm phone** on. No built-in provider is needed while the hook is on.
6. App: `EXPO_PUBLIC_AUTH_PHONE_ENABLED=true` in `.env` and the EAS environment.
7. Test with a real phone number.

**About "no limit"**: the app adds no cap of its own. Keep Supabase's per-hour SMS rate limit (Authentication → Rate Limits) and consider enabling CAPTCHA on sign-up: open SMS endpoints are a target for "SMS pumping" fraud, where bots trigger thousands of paid texts to premium numbers. Raise the limit as real traffic grows.

## Changing providers later

`app_config.sms_provider` (default `smsto`) and `app_config.sms_sender_id` (default `DietBuddy`) are read on every SMS. The admin dashboard edits them. Adding another provider means adding it to `supabase/functions/send-sms` and its API key as a secret; until then, unknown provider names fail loudly instead of silently dropping codes.
