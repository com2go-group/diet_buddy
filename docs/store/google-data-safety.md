# Google Play Console: Data safety and health declarations

Answers for **Play Console → App content → Data safety**, derived from `docs/data-inventory.md`.
"Shared" means transferred to a third party. Transfers to service providers that process data on
our behalf (Supabase, Anthropic, RevenueCat, Brevo, sms.to, Expo) do **not** count as sharing
under Play's definition. Rows marked **AdMob** follow Google's disclosure for the Google Mobile
Ads SDK (developers.google.com/admob/android/privacy/play-data-disclosure); check it before each
submission.

## Overview questions

| Question                                                              | Answer                                                                     |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Does your app collect or share any of the required user data types?   | Yes                                                                        |
| Is all of the user data collected by your app encrypted in transit?   | Yes                                                                        |
| Do you provide a way for users to request that their data is deleted? | Yes: in the app (Profile → Privacy & Data → Delete account) and on the web |
| Account deletion URL                                                  | `https://<your-domain>/legal/delete-account`                               |
| Privacy policy URL                                                    | `https://<your-domain>/legal/privacy`                                      |
| Independent security review                                           | No (optional)                                                              |

## Data types

| Category                 | Data type                      | Collected | Shared                          | Ephemeral | Required or optional                                             | Purposes                                                                                         |
| ------------------------ | ------------------------------ | --------- | ------------------------------- | --------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Personal info            | Name                           | Yes       | No                              | No        | Required                                                         | App functionality, Personalization                                                               |
| Personal info            | Email address                  | Yes       | No                              | No        | Required for email sign-up (Apple/Google/phone sign-up possible) | App functionality, Account management, Developer communications (marketing only with consent)    |
| Personal info            | User IDs                       | Yes       | No                              | No        | Required                                                         | App functionality, Account management                                                            |
| Personal info            | Phone number                   | Yes       | No                              | No        | Optional                                                         | App functionality, Account management                                                            |
| Personal info            | Political or religious beliefs | Yes       | No                              | No        | Optional                                                         | App functionality (halal or kosher dietary restrictions)                                         |
| Personal info            | Other info                     | Yes       | No                              | No        | Required                                                         | App functionality (date of birth for the 18+ check, gender for calorie needs)                    |
| Financial info           | Purchase history               | Yes       | No                              | No        | Optional                                                         | App functionality (Premium status via RevenueCat)                                                |
| Health and fitness       | Health info                    | Yes       | No                              | No        | Required                                                         | App functionality, Personalization                                                               |
| Health and fitness       | Fitness info                   | Yes       | No                              | No        | Optional                                                         | App functionality, Personalization                                                               |
| Messages                 | Other in-app messages          | Yes       | No                              | No        | Optional                                                         | App functionality, Personalization (coach chats, support requests)                               |
| Photos and videos        | Photos                         | Yes       | No                              | No        | Optional                                                         | App functionality (progress photos stored privately; scan photos processed only for the request) |
| App activity             | App interactions               | Yes       | Yes (**AdMob**)                 | No        | Optional                                                         | Advertising or marketing, Analytics (free plan ads)                                              |
| App activity             | Other user-generated content   | Yes       | No                              | No        | Optional                                                         | App functionality (food logs, check-ins, insights)                                               |
| App info and performance | Crash logs, Diagnostics        | Yes       | Yes (**AdMob**)                 | No        | Optional                                                         | Advertising or marketing, Analytics                                                              |
| Device or other IDs      | Device or other IDs            | Yes       | Yes (**AdMob**: advertising ID) | No        | Optional                                                         | App functionality (push token), Advertising or marketing, Fraud prevention                       |
| Location                 | Approximate location           | Yes       | Yes (**AdMob**)                 | No        | Optional                                                         | Advertising or marketing (from IP address)                                                       |

Not collected: precise location, contacts, calendar, files, audio, web browsing, SMS or call
logs, installed apps, financial account details.

## Health apps declaration

Play Console → App content → **Health apps**: declare DietBuddy as a nutrition and weight
management app. It is not a medical device and does not diagnose or treat conditions.

## Health Connect permissions declaration

Play Console → App content → **Health Connect** (required before release). The app requests:

| Permission                    | Why                                                                                |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| `READ_WEIGHT`                 | Import weigh-ins from smart scales into the progress chart                         |
| `WRITE_WEIGHT`                | Save check-in weights to Health Connect                                            |
| `READ_BODY_FAT`               | Show body fat from smart scales                                                    |
| `READ_STEPS`                  | Show today's steps on Home (not stored)                                            |
| `READ_ACTIVE_CALORIES_BURNED` | Show today's active energy on Home (not stored, never added to the calorie target) |
| `READ_HYDRATION`              | Include water logged in other apps                                                 |
| `WRITE_HYDRATION`             | Save water glasses to Health Connect                                               |

Health Connect data is used only for these features, is never used for advertising and is never
shared with ad or analytics SDKs. The privacy policy (section 5) says so, as Google requires.

## Ads

Play Console → App content → **Ads**: Yes, the app contains ads (free plan only).

## Target audience

Adults 18+ only (see `docs/store/age-rating.md`). Not designed for children; not in the
Families program.
