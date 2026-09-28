# Publishing on the App Store (step by step)

From nothing to "Ready for Sale". Work through the parts in order; each step says where to click
and what to type. Development happens on Windows: builds run in the cloud with EAS Build, so no
Mac is needed.

Time needed: about a day of work spread over one to two weeks (Apple's enrollment check and the
review take a few days each).

## Part 0. What must already be in place

The app talks to a live backend, so these come first. Each has its own guide.

| #   | What                                                                                   | Guide                              |
| --- | -------------------------------------------------------------------------------------- | ---------------------------------- |
| 1   | Website live at https://dietbuddy.me (privacy, terms, deletion pages)                  | `landing/README.md`                |
| 2   | Supabase project (EU region), schema pushed, `seed.sql` run, Edge Functions deployed   | `docs/backend.md`                  |
| 3   | Secrets set: `USDA_API_KEY`, `ANTHROPIC_API_KEY`, and the others in `docs/backend.md`  | `docs/backend.md` → Edge Functions |
| 4   | Email codes through Brevo (Supabase → Authentication → SMTP)                           | `docs/setup/email-sms.md`          |
| 5   | Legal entity filled in (`EXPO_PUBLIC_LEGAL_*`, and `landing/config.js` on the website) | `docs/legal.md`                    |

Tools on your Windows PC (once):

1. Install **Node.js LTS** (nodejs.org) and **Git** (git-scm.com).
2. Open a terminal in the project folder and run `npm install`.
3. Install the EAS command-line tool: `npm install -g eas-cli`.
4. Create a free account at **expo.dev**, then run `eas login` and `eas init`. `eas init` links the
   project and adds its `projectId` to `app.json`; commit that change.

## Part 1. Join the Apple Developer Program

1. Go to **developer.apple.com/programs/enroll** and sign in with the Apple Account you want to
   own the app (use a company address, not a personal one, if you can).
2. Choose how to enroll:
   - **Organization** (recommended if you have a company): the store shows the company name as
     the seller. You need a **D-U-N-S number** for the company (free, from Dun & Bradstreet;
     Apple's enrollment page links to the lookup; it can take up to a couple of weeks), a
     company website (dietbuddy.me) and the legal authority to sign for the company.
   - **Individual**: faster, but your personal name is shown as the seller.
3. Pay the **99 USD/year** fee. Approval usually takes 1–2 days (longer for organizations).
4. When approved, sign in to **appstoreconnect.apple.com** → **Business** (or "Agreements, Tax,
   and Banking"): accept the **Paid Apps** agreement and add your bank account and tax forms.
   Subscriptions don't work until this shows **Active**.

## Part 2. Register the app

1. **developer.apple.com/account** → Certificates, Identifiers & Profiles → **Identifiers** → +
   → App IDs → App → Description `DietBuddy`, Bundle ID **Explicit** `com.com2go.dietbuddy`.
   Tick **HealthKit**, **Sign In with Apple** and **Push Notifications**, then Register.
   (EAS can also do this during the first build, but doing it here avoids surprises.)
2. **appstoreconnect.apple.com** → Apps → **+** → New App:
   - Platform **iOS**, Name **DietBuddy: Nutrition Coach**, Primary language **English (U.S.)**
     (or English (U.K.)), Bundle ID `com.com2go.dietbuddy`, SKU `dietbuddy`, User access Full.
3. Open the new app → **App Information** and note the **Apple ID** (a number such as
   `6741234567`). Add it to `eas.json` so submitting doesn't ask every time:

   ```json
   "submit": {
     "production": {
       "ios": { "ascAppId": "6741234567" },
       "android": { "track": "internal", "releaseStatus": "draft" }
     }
   }
   ```

## Part 3. Services the iOS app needs

Do these now; each guide lists the exact clicks. The app works without them, but the reviewer
will try them.

1. **Sign in with Apple**: `docs/auth.md` §3 (Services ID and key in Supabase).
2. **Google Sign-In on iOS** (optional): `docs/auth.md` §4.
3. **Subscriptions**: `docs/setup/revenuecat.md` steps 2–4. In App Store Connect create the
   subscription group "Premium" with `dietbuddy_premium_monthly` (7-day free trial) and
   `dietbuddy_premium_annual`, each with a display name, description, price and a **review
   screenshot** of the paywall.
4. **Ads**: `docs/setup/admob.md` (iOS app in AdMob, GDPR message, unit IDs).
5. **Push notifications**: `docs/setup/push.md` (EAS creates the APNs key on the first build).

## Part 4. Production settings for the build

The app reads its public settings when it is built. Put them in EAS (they are not in git):

```bash
eas env:create --environment production --visibility plaintext --name EXPO_PUBLIC_SUPABASE_URL --value https://<project-ref>.supabase.co
eas env:create --environment production --visibility plaintext --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon key>
eas env:create --environment production --visibility plaintext --name EXPO_PUBLIC_LEGAL_COMPANY --value "<company>"
eas env:create --environment production --visibility plaintext --name EXPO_PUBLIC_LEGAL_ADDRESS --value "<address>"
eas env:create --environment production --visibility plaintext --name EXPO_PUBLIC_LEGAL_EMAIL --value <privacy email>
eas env:create --environment production --visibility plaintext --name EXPO_PUBLIC_LEGAL_COUNTRY --value "<country>"
eas env:create --environment production --visibility plaintext --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value <appl_...>
eas env:create --environment production --visibility plaintext --name ADMOB_IOS_APP_ID --value <ca-app-pub-...~...>
eas env:create --environment production --visibility plaintext --name EXPO_PUBLIC_ADMOB_IOS_BANNER --value <unit id>
eas env:create --environment production --visibility plaintext --name EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL --value <unit id>
eas env:create --environment production --visibility plaintext --name EXPO_PUBLIC_ADMOB_IOS_REWARDED --value <unit id>
```

Add the Google Sign-In values (`EXPO_PUBLIC_GOOGLE_*`) and `EXPO_PUBLIC_AUTH_PHONE_ENABLED=true`
if you use them. You can also add them in the browser: expo.dev → your project →
**Environment variables**. `.env.example` lists every setting.

The RevenueCat **Test Store** key (`test_...`) belongs only in the `development` and `preview`
environments; the `production` environment must have the real `appl_...` key
(`docs/setup/revenuecat.md`).

## Part 5. Build and upload

1. Make sure `version` in `app.json` is the version you want to show (1.0.0 for the first
   release). The build number is increased automatically.
2. Build in the cloud:

   ```bash
   eas build --platform ios --profile production
   ```

   The first time, EAS asks you to sign in with your Apple Account and offers to create the
   distribution certificate, provisioning profile and push key for you: answer **Yes** to each.
   The build takes about 20–40 minutes; the link in the terminal shows progress.

3. Upload it to App Store Connect:

   ```bash
   eas submit --platform ios --latest
   ```

   After 10–30 minutes of processing the build appears in App Store Connect → **TestFlight**.
   (No export-compliance question: `app.json` declares that the app uses only standard HTTPS
   encryption.)

## Part 6. Test with TestFlight

1. App Store Connect → TestFlight → **Internal Testing** → + → add yourself (and your team) as
   testers. Install the **TestFlight** app on your iPhone and accept the invitation.
2. Go through this list on the phone:
   - Sign up with email (code arrives), finish onboarding, see the plan.
   - Log food by search, barcode and photo; log water; do a check-in.
   - Chat with the coach.
   - Profile → Health apps → Connect (Apple Health).
   - Open the paywall, buy with a **Sandbox** account (Settings → App Store → Sandbox Account),
     then Restore purchases.
   - Ads: accept the consent message, see a banner and a rewarded video.
   - Profile → Privacy & Data → Export my data, and delete a test account.
3. Create the **demo account for Apple** in this build (an email you control, onboarding done,
   a few foods logged). You'll enter it in Part 7.

## Part 7. Fill in the App Store page

In App Store Connect → your app. Texts are in `listing.md`, graphics in `graphics/`,
screenshots in `screenshots/`.

1. **App Information**: subtitle, categories (Health & Fitness, Food & Drink), content rights
   ("Yes, it contains third-party content and I have the rights": USDA and Open Food Facts data
   are openly licensed), **Age Rating** (answers in `age-rating.md`, then choose 18+), License
   Agreement (optional custom Terms).
2. **Regulatory questions** (App Information): if asked whether the app is a **regulated
   medical device**, answer **No**.
3. **EU Digital Services Act (trader status)**: Business → your account → declare that you are
   a **trader** (you sell subscriptions) and give the address, phone and email that will be shown
   on the store page in the EU. Without this the app can't be published in the EU.
4. **App Privacy**: Privacy Policy URL https://dietbuddy.me/privacy.html, then the data types
   exactly as in `apple-app-privacy.md`. Publish the answers.
5. **Pricing and Availability**: price **Free**; choose the countries (for example all EU
   countries, the UK, US…).
6. **Version 1.0 page** (under "iOS App"):
   - **Screenshots**: drag the six files from `screenshots/iphone-6.7/` into the **6.9" iPhone**
     slot (1290 × 2796 is accepted there). iPad screenshots are not needed (iPhone only).
   - Promotional text, description, keywords, support URL, marketing URL, "What's New" from
     `listing.md`.
   - **Build**: pick the TestFlight build.
   - **In-App Purchases and Subscriptions**: tick the Monthly and Annual subscriptions. The first
     subscriptions must be submitted together with an app version.
   - **App Review Information**: demo account (email + password), contact details and the notes
     from `listing.md`.
   - **Version Release**: "Manually release this version" lets you choose the launch moment.
7. Click **Add for Review**, then **Submit for Review**.

## Part 8. Review and launch

1. Review usually takes 1–3 days. You get emails at each status change.
2. If Apple rejects the app, the message in **App Review** says which guideline and why. Fix it
   (or reply with an explanation), build again if code changed, and resubmit. Common ones for
   this kind of app:
   - _2.1 (information needed)_: the demo account didn't work → check it in the TestFlight build.
   - _3.1.2 (subscriptions)_: the Terms/Privacy links or renewal wording → they are on the
     paywall and in the description; make sure the Terms link is in the description or EULA field.
   - _5.1.1 (data)_: a permission text unclear → the texts are in `app.json`.
   - _1.4.1 (health)_: medical claims → keep the listing wording from `listing.md`.
3. When the status is **Pending Developer Release**, click **Release This Version**.
4. Copy the App Store link (App Store Connect → App Information → "View on App Store", like
   `https://apps.apple.com/app/id6741234567`) and:
   - put it in `landing/config.js` → `appStoreUrl` on the website, so the download buttons work;
   - add it to EAS as `EXPO_PUBLIC_APP_STORE_URL` (for the "Time to update" screen) for the next
     build.

## Updating the app later

1. Change the code, raise `version` in `app.json` (1.0.1, 1.1.0…).
2. `eas build --platform ios --profile production`, then `eas submit --platform ios --latest`.
3. App Store Connect → **+ Version**, fill in "What's New", pick the build, submit for review.

Small JavaScript-only fixes can also be delivered with EAS Update later; ask before adding it.
