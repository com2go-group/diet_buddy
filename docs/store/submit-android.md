# Publishing on Google Play (step by step)

Do the App Store guide (`submit-ios.md`) Parts 0 and 4 first: the backend, website, tools and
EAS settings are shared. Builds run in the cloud with EAS Build.

Time needed: a few hours of work, plus Google's checks. New **personal** developer accounts must
also run a closed test with at least 12 testers for 14 days before the app can go public (see
Part 6), so start early.

## Part 1. Create the Google Play developer account

1. Go to **play.google.com/console/signup** and sign in with the Google account that will own
   the app (a company account is best).
2. Choose the account type:
   - **Organization** (recommended if you have a company): needs a **D-U-N-S number** (the same
     one as for Apple), company website and contact details. No 12-tester rule.
   - **Personal**: faster to open, but new personal accounts must run the closed test in Part 6
     before production.
3. Pay the **25 USD** one-time fee and complete **identity verification** (ID document; takes
   from hours to a few days). Verify the contact phone and email when asked.
4. **Setup → Payments profile**: add a merchant/payments profile with your bank details, or you
   can't sell subscriptions.

## Part 2. Create the app

Play Console → **Create app**:

- App name **DietBuddy: Nutrition Coach**, default language **English (United States)**
  (or English (United Kingdom)), **App**, **Free**.
- Tick the declarations (developer policies, US export laws) and create.

The package name is fixed by the first upload: `com.com2go.dietbuddy` (from `app.json`).

## Part 3. Production settings for the Android build

Add the Android values to EAS next to the ones from `submit-ios.md` Part 4:

```bash
eas env:create --environment production --visibility plaintext --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value <goog_...>
eas env:create --environment production --visibility plaintext --name ADMOB_ANDROID_APP_ID --value <ca-app-pub-...~...>
eas env:create --environment production --visibility plaintext --name EXPO_PUBLIC_ADMOB_ANDROID_BANNER --value <unit id>
eas env:create --environment production --visibility plaintext --name EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL --value <unit id>
eas env:create --environment production --visibility plaintext --name EXPO_PUBLIC_ADMOB_ANDROID_REWARDED --value <unit id>
```

Android push needs Firebase: `docs/setup/push.md` §2 (upload the FCM key to Expo).

## Part 4. Build and make the first upload by hand

Google only accepts automatic uploads after the first one was made in the browser.

1. Build the Android App Bundle in the cloud:

   ```bash
   eas build --platform android --profile production
   ```

   The first time, EAS offers to **generate a new upload keystore**: answer **Yes**. EAS keeps it
   safe; Google then signs the published app for you (Play App Signing).

2. When the build finishes, open the build link and **download the `.aab` file**.
3. Play Console → your app → **Test and release → Testing → Internal testing** → **Create new
   release** → accept Play App Signing → upload the `.aab` → release name `1.0.0` → notes
   "First build" → **Save**, **Review release**, **Start rollout to Internal testing**.
4. **Testers** tab: create an email list with your own Google account(s) and copy the **join
   link**. Open it on your Android phone to install the app from Play.

From now on, uploads can be automatic:

1. Create a **Google service account key** (Expo's guide: docs.expo.dev → "Creating a Google
   Service Account key for Play Store submissions"). In short: Google Cloud Console → IAM →
   Service accounts → create → Keys → Add key → JSON; then Play Console → **Users and
   permissions** → invite the service account's email with release permissions for this app.
2. Upload the JSON key to EAS once: `eas credentials --platform android` → Google Service Account
   → upload key. (Never commit the JSON to git.)
3. Later builds: `eas build --platform android --profile production`, then
   `eas submit --platform android --latest`. `eas.json` sends them to the **internal** track as a
   draft; you promote them in the Console.

## Part 5. Services for Android

1. **Subscriptions**: now that a build is uploaded, create them: `docs/setup/revenuecat.md`
   step 2 (Play Console → Monetize → Subscriptions: `dietbuddy_premium_monthly` with a 7-day
   free trial offer, `dietbuddy_premium_annual`) and connect Play to RevenueCat (step 3, service
   account).
2. **Google Sign-In**: add the **SHA-1** of Google's app-signing key (Play Console → Test and
   release → **App integrity** → App signing) to the Android OAuth client (`docs/auth.md` §4).
   Without it Google Sign-In fails in the store build.
3. **Ads**: Android app in AdMob, GDPR message (`docs/setup/admob.md`).
4. Test on the phone (install from the internal testing link): sign up, onboarding, logging,
   coach, Health Connect (Profile → Health apps), a test purchase with a **license tester**
   account (Play Console → Settings → License testing), ads, export and delete.
5. Create the **demo account** for Google's reviewers (email you control, onboarding done).

## Part 6. Closed test (new personal accounts only)

If Play Console shows "Production access" as locked:

1. **Testing → Closed testing** → create a track, add at least **12 testers** (email list or
   Google Group), promote the internal build to it and start the rollout.
2. Testers must **opt in with the link and keep the app installed for 14 days in a row**. Ask
   friends and family; the app should really be used.
3. After 14 days: **Dashboard → Apply for production**, answer the questions about the test
   (what testers did, what you changed). Google replies within about a week.

Organization accounts skip this part.

## Part 7. App content (the declarations)

Play Console → **Policy and programs → App content** (or the Dashboard "Set up your app" list).
Answers are prepared in `google-data-safety.md` and `age-rating.md`.

| Declaration                         | Answer                                                                                         |
| ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| Privacy policy                      | https://dietbuddy.me/privacy.html                                                              |
| App access                          | Restricted: demo account + "Sign in with email and password. Onboarding is already completed." |
| Ads                                 | Yes, contains ads                                                                              |
| Content rating                      | IARC questionnaire as in `age-rating.md`                                                       |
| Target audience                     | 18 and over only                                                                               |
| Data safety                         | As in `google-data-safety.md`; delete-account URL https://dietbuddy.me/delete-account.html     |
| Advertising ID                      | Yes, used for advertising (AdMob)                                                              |
| Health apps                         | Declare the health features (nutrition, weight, activity), `google-data-safety.md`             |
| Health Connect permissions          | Fill the form per permission (`docs/setup/health.md`); Google reviews this before production   |
| Government app / Financial features | No / No                                                                                        |
| News app                            | No                                                                                             |

## Part 8. Store listing

**Grow → Store presence → Main store listing** (texts in `listing.md`):

- App name, short description, full description (Health Connect version).
- **App icon**: `graphics/play-icon-512.png`.
- **Feature graphic**: `graphics/play-feature-graphic-1024x500.png`.
- **Phone screenshots**: the six files in `screenshots/android-phone/`.
- **Store settings**: category **Health & Fitness**, tags, contact email, website
  https://dietbuddy.me.

## Part 9. Release to production

1. **Test and release → Production → Countries/regions**: add the countries.
2. **Create new release** → **Add from library** → pick the tested build → release notes
   "Welcome to DietBuddy!" → **Review release** → fix anything listed → **Start rollout to
   Production** (a staged rollout, for example 20 %, is safer for the first days).
3. Review usually takes from a few hours to a few days (longer for new accounts and health
   apps). The **Publishing overview** page shows the status.
4. When it's live, copy the store link
   `https://play.google.com/store/apps/details?id=com.com2go.dietbuddy` and:
   - put it in `landing/config.js` → `playStoreUrl` on the website;
   - add it to EAS as `EXPO_PUBLIC_PLAY_STORE_URL` for the next build.
5. Publish **app-ads.txt** at https://dietbuddy.me/app-ads.txt (`docs/setup/admob.md`).

## Updating the app later

1. Raise `version` in `app.json` (the Android version code increases automatically).
2. `eas build --platform android --profile production`, then `eas submit --platform android --latest`.
3. Play Console → Internal testing → check it → **Promote release** to Production.
