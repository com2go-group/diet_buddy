# Testing

| Layer                                                                | Tool                                | Command                                                    |
| -------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------- |
| Unit and component tests (app, domain logic, Edge Function handlers) | Jest + React Native Testing Library | `npm test`                                                 |
| Database (schema, RLS, triggers)                                     | pgTAP                               | `npm run db:test` (local stack) or `npm run db:test:plain` |
| End-to-end journeys                                                  | Maestro                             | `npm run e2e`                                              |

Before finishing any change, run `npm run typecheck`, `npm run lint` and `npm test` (CLAUDE.md §15).

## End-to-end flows (Maestro)

The store-submission journey is **sign up → onboarding → body scan → plan → log food →
paywall**, in `.maestro/`:

| File                         | What it does                                                                                                      |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `signup-to-paywall.yaml`     | The whole journey on a phone (iOS simulator or Android emulator/device)                                           |
| `web/signup-to-paywall.yaml` | The same journey on the web build                                                                                 |
| `subflows/signup.yaml`       | Welcome → sign-up form → email code                                                                               |
| `subflows/verify-code.yaml`  | Reads the code from the local mail catcher and enters it                                                          |
| `subflows/onboarding.yaml`   | Every onboarding question (lose fat, 82 → 70 kg, simple answers)                                                  |
| `subflows/plan.yaml`         | Closes the test interstitial if shown, manual body scan, skips the "Your AI Plan" video gate, initial plan → Home |
| `subflows/log-food.yaml`     | Meals → Log Food → manual entry of a snack                                                                        |
| `subflows/paywall.yaml`      | Home → Subscribe → checks the paywall content                                                                     |
| `scripts/*.js`               | New email per run, reading the code from Mailpit, API sign-up for web                                             |

### Setup

1. Install the Maestro CLI (maestro.dev; on Windows use WSL, or run the flows on Maestro Cloud).
2. Start the local backend: `npm run db:start`, then serve the Edge Functions with
   `npx supabase functions serve`. Emails with verification codes are caught by Mailpit at
   http://127.0.0.1:54324, where `scripts/otp.js` reads them.
3. Use a development or preview build pointing at that backend (`EXPO_PUBLIC_SUPABASE_URL`). Ads
   use Google's test units in development builds; the flows close the test interstitial and skip
   the rewarded video. Purchases aren't made; the flow only opens the paywall.

### Run

```bash
# Phone: an emulator/simulator (or device) with the app installed
npm run e2e
# Android emulators reach your computer's Mailpit at 10.0.2.2:
maestro test .maestro -e MAILBOX_URL=http://10.0.2.2:54324

# Web: start the web build (npm run web), then
maestro test .maestro/web -e WEB_URL=http://localhost:8081 \
  -e SUPABASE_URL=http://127.0.0.1:54321 -e SUPABASE_ANON_KEY=<local anon key>
```

### Selectors

- Buttons, options and headings are matched by their visible text.
- Text fields are matched by placeholder text (for example `alex@example.com`, `DD`) or by
  `id`: `TextField`, `DateField` and the code field set `testID` to their label. On the web
  build Maestro uses the accessibility label as the element ID, so `id: "Password"` works on
  every platform.
- Tab bar buttons also have `testID` equal to their label (`id: "Meals"`). Tabs stay mounted, so
  plain text such as "Meals" can match a hidden screen's heading.

### Web limitations (Maestro web is in beta)

- The web driver can't scroll inner scroll views, so run it with a tall browser window (for
  example a `google-chrome` wrapper adding `--window-size=500,2400`).
- It can't fill the auto-advancing date-of-birth boxes, so the web flow creates the account
  through the Auth API (`scripts/api-signup.js`), then signs in and enters the emailed code in
  the app. The phone flow uses the real sign-up form.

The web journey was verified end to end on 2026-09-28 against the web build.
