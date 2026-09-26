# Push notifications setup

The app code is done:

- **Local reminders** (meals at 8:30 / 12:30 / 19:00, check-in at 20:30) are scheduled on the phone and work as soon as the user allows notifications, with no server setup.
- **Server pushes** (achievements, streak milestones, the weekly report, and promotions for users with marketing consent) are created as rows in `notifications` and sent by the `push-dispatch` Edge Function through Expo's push service.
- Users manage everything in Profile → Notifications.

You need an **Expo account** (https://expo.dev/signup), plus the Apple Developer and Google Play accounts from `docs/setup/revenuecat.md`, and a **Firebase** project for Android (free: https://console.firebase.google.com).

## 1. Link the project to EAS

```bash
npx eas login
npx eas init            # creates the EAS project and adds extra.eas.projectId to app.json
```

The app needs that project ID to get push tokens. Commit the `app.json` change.

## 2. Credentials

**iOS**: during `npx eas build --platform ios`, answer **yes** to "Set up Push Notifications". EAS creates an Apple Push Notifications key and stores it. (Or later: `npx eas credentials` → iOS → Push Notifications.)

**Android** (Firebase Cloud Messaging v1):

1. Firebase console → Add project "DietBuddy" → Add app → Android, package `com.com2go.dietbuddy`. Download `google-services.json` into the repo root and add `"googleServicesFile": "./google-services.json"` under `expo.android` in `app.json`.
2. Firebase → Project settings → Service accounts → **Generate new private key** (JSON). Keep it out of git.
3. `npx eas credentials` → Android → Google Service Account → **Upload** the key for "Push Notifications (FCM V1)".

## 3. Server: send pushes

1. Pick a random secret: `openssl rand -hex 32`.
2. `npx supabase secrets set CRON_SECRET=<secret>`.
   Optional: in expo.dev → Account settings → Access tokens, create a token, turn on "Enhanced security for push notifications" in the project, and `npx supabase secrets set EXPO_ACCESS_TOKEN=<token>`.
3. `npx supabase functions deploy push-dispatch`.
4. Supabase dashboard → Database → Extensions: enable **pg_cron** and **pg_net**.
5. SQL editor, run once (replace `<project-ref>` and `<secret>`):

```sql
-- Send pending notifications every 5 minutes.
select cron.schedule('push-dispatch', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/push-dispatch',
    headers := '{"Authorization": "Bearer <secret>", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
$$);

-- Weekly progress report, Mondays 08:00 UTC.
select cron.schedule('weekly-report', '0 8 * * 1', $$ select public.create_weekly_reports(); $$);
```

## 4. Test on a phone

1. Install a development build (`npx eas build --profile development`).
2. Profile → Notifications → **Turn on notifications**. A row appears in `push_tokens`.
3. Insert a test notification in the SQL editor:
   `insert into notifications (user_id, type, title, body) values ('<your user id>', 'achievement', '🏆 Test', 'Hello');`
4. Wait for the cron run (or call the function with the secret using curl). The push arrives, and tapping it opens Progress.
5. Change the time of a local reminder by setting the phone clock, or trust the unit tests.

Tokens that Expo reports as `DeviceNotRegistered` are deleted automatically. Signing out removes the device's token and cancels its reminders.
