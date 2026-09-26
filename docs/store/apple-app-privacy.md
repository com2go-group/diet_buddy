# App Store Connect: App Privacy answers

Answers for **App Store Connect → App Privacy** ("nutrition label"), derived from
`docs/data-inventory.md` and the SDKs in the app. Re-check whenever the data inventory changes,
and before each submission check Google's current disclosure for the Google Mobile Ads SDK
(developers.google.com/admob/ios/privacy/data-disclosure), because rows marked **AdMob** depend
on it.

- **Privacy Policy URL:** `https://<your-domain>/legal/privacy` (see `docs/legal.md`).
- **Do you or your third-party partners collect data from this app?** Yes.
- **Tracking:** No. The app never shows Apple's tracking prompt, never reads the IDFA and
  always requests **non-personalised** ads on iOS (`src/lib/ads/config.ts`). No data is linked
  with third-party data for targeted advertising or shared with data brokers. If personalised
  ads are ever enabled on iOS, add the App Tracking Transparency prompt first and change these
  answers.

## Data collected

"Linked" = linked to the user's identity. All data the app stores is tied to the account.

| Category         | Data type                                           | Collected | Linked | Used for tracking | Purposes                                                                              | Source                                                                       |
| ---------------- | --------------------------------------------------- | --------- | ------ | ----------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Contact Info     | Name                                                | Yes       | Yes    | No                | App Functionality, Product Personalization                                            | Profile greeting                                                             |
| Contact Info     | Email Address                                       | Yes       | Yes    | No                | App Functionality; Developer's Advertising or Marketing (only with marketing consent) | Sign-in, account emails                                                      |
| Contact Info     | Phone Number                                        | Yes       | Yes    | No                | App Functionality                                                                     | Phone sign-in (optional)                                                     |
| Health & Fitness | Health                                              | Yes       | Yes    | No                | App Functionality, Product Personalization                                            | Weight, body measurements, allergies, check-ins, Apple Health data           |
| Health & Fitness | Fitness                                             | Yes       | Yes    | No                | App Functionality, Product Personalization                                            | Activity level, training, steps and active energy (shown, not stored)        |
| Sensitive Info   | Sensitive Info                                      | Yes       | Yes    | No                | App Functionality                                                                     | Dietary restrictions such as halal or kosher may reveal religious beliefs    |
| User Content     | Photos or Videos                                    | Yes       | Yes    | No                | App Functionality                                                                     | Progress photos (stored privately). Scan photos are processed and not stored |
| User Content     | Customer Support                                    | Yes       | Yes    | No                | App Functionality                                                                     | Help & support requests                                                      |
| User Content     | Other User Content                                  | Yes       | Yes    | No                | App Functionality, Product Personalization                                            | Coach conversations, wellness insights, food logs                            |
| Identifiers      | User ID                                             | Yes       | Yes    | No                | App Functionality                                                                     | Account ID (also sent to RevenueCat and in rewarded-ad callbacks)            |
| Identifiers      | Device ID                                           | Yes       | Yes    | No                | App Functionality; Third-Party Advertising (**AdMob**)                                | Push token; ad SDK identifiers                                               |
| Purchases        | Purchase History                                    | Yes       | Yes    | No                | App Functionality                                                                     | Premium status via RevenueCat                                                |
| Usage Data       | Product Interaction                                 | Yes       | No     | No                | Third-Party Advertising, Analytics (**AdMob**)                                        | Ad SDK                                                                       |
| Usage Data       | Advertising Data                                    | Yes       | No     | No                | Third-Party Advertising (**AdMob**)                                                   | Ads seen and tapped                                                          |
| Diagnostics      | Crash Data, Performance Data, Other Diagnostic Data | Yes       | No     | No                | Third-Party Advertising, Analytics (**AdMob**)                                        | Ad SDK diagnostics (add App Functionality when Sentry is added)              |
| Location         | Coarse Location                                     | Yes       | No     | No                | Third-Party Advertising (**AdMob**)                                                   | Approximate location from IP address, for ad delivery                        |
| Other Data       | Other Data Types                                    | Yes       | Yes    | No                | App Functionality                                                                     | Date of birth (age check), gender (calorie calculation)                      |

## Not collected

Financial info (payments go through Apple), precise location, contacts, browsing history,
search history (food searches aren't stored), audio, gameplay content, emails or text messages,
sensitive info other than the above, and any analytics of our own (PostHog/Sentry aren't
integrated yet; update this file when they are).

## Also in App Store Connect

- **HealthKit:** enable the HealthKit capability (the config plugin does this). In the review
  notes, explain that DietBuddy reads weight, body fat, steps, active energy and water, and writes
  weight and water, only to track progress, never for advertising (App Review Guideline 5.1.3).
- **Sign in with Apple** is offered on iOS alongside Google (Guideline 4.8).
- **Account deletion** is in the app: Profile → Privacy & Data → Delete account (Guideline
  5.1.1(v)).
- **Review notes:** provide a demo account with onboarding completed and some logged data.
  To review Premium features, a sandbox tester can use the 7-day free trial.
- **Medical:** the app shows "not medical advice" disclaimers in onboarding, the plan and the
  coach (Guideline 1.4.1). It does not diagnose or treat conditions.
