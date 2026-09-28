# Store submission

**Step-by-step guides:** `submit-ios.md` (App Store, do this first) and `submit-android.md`
(Google Play). Listing texts and review notes: `listing.md`. Store graphics: `graphics/` (App
Store icon 1024, Play icon 512, Play feature graphic 1024 × 500). Screenshots: `screenshots/`.

What CLAUDE.md §16 lists before store submission, and where each part stands.

| Item                                                 | Where                                                           | Status                         | Still to do                                                                             |
| ---------------------------------------------------- | --------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------- |
| Privacy policy and terms URLs                        | https://dietbuddy.me/privacy.html, /terms.html; `docs/legal.md` | Drafts in the app              | Fill `EXPO_PUBLIC_LEGAL_*`, lawyer review, sign DPAs, upload `landing/` to dietbuddy.me |
| Account deletion URL (Google Play)                   | https://dietbuddy.me/delete-account.html                        | Done                           | Upload `landing/` (`https://dietbuddy.me/delete-account.html`)                          |
| App Store privacy label                              | `apple-app-privacy.md`                                          | Answers ready                  | Enter in App Store Connect; re-check AdMob's disclosure                                 |
| Google Play Data safety, Health apps, Health Connect | `google-data-safety.md`                                         | Answers ready                  | Enter in Play Console                                                                   |
| Age rating                                           | `age-rating.md`                                                 | Answers ready (18+)            | Enter in both consoles                                                                  |
| Screenshots                                          | `screenshots/`                                                  | Web drafts at store sizes      | Final captures on devices with `.maestro/screenshots/`                                  |
| Accessibility pass                                   | `docs/accessibility.md`                                         | Automated audit done and fixed | VoiceOver/TalkBack and largest text checks on devices                                   |
| E2E tests (signup → plan → log → paywall)            | `.maestro/`, `docs/testing.md`                                  | Web journey passes             | Run `npm run e2e` on an iOS simulator and Android emulator with a development build     |

## Website and store URLs

The website is the `landing/` folder hosted at https://dietbuddy.me (`landing/README.md`).

| Store field                                                     | URL                                                                                                |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| App Store Connect → App Privacy → Privacy Policy URL            | https://dietbuddy.me/privacy.html                                                                  |
| App Store Connect → version → Support URL                       | https://dietbuddy.me (set `supportEmail` in `landing/config.js` so the page shows contact details) |
| App Store Connect → version → Marketing URL                     | https://dietbuddy.me                                                                               |
| App Store Connect → App Information → License Agreement (Terms) | https://dietbuddy.me/terms.html                                                                    |
| Play Console → App content → Privacy policy                     | https://dietbuddy.me/privacy.html                                                                  |
| Play Console → Data safety → Delete account URL                 | https://dietbuddy.me/delete-account.html                                                           |
| Play Console → Store settings → Website                         | https://dietbuddy.me                                                                               |
| AdMob → GDPR message → Privacy policy                           | https://dietbuddy.me/privacy.html                                                                  |
| AdMob app-ads.txt                                               | https://dietbuddy.me/app-ads.txt (`docs/setup/admob.md`)                                           |

In the app, the Terms and Privacy Policy links (sign-up, onboarding consent, Profile, paywall)
open these pages (`src/lib/site.ts`), and Profile → Website opens the home page.

Other setup guides (stores, RevenueCat, AdMob, email and SMS, push, health) are in
`docs/setup/`.
