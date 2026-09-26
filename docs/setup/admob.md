# Ads setup (Google AdMob + consent)

The app code is done: Google's UMP consent form, banners, the interstitial before the body scan, the opt-in rewarded videos ("Your AI Plan" and daily meal-plan unlocks) and the `admob-ssv` Edge Function that records rewards. Until you finish these steps, development builds show **Google test ads** only. Never tap live ads on your own devices.

You need a **Google AdMob** account (free): https://admob.google.com (sign in with the Google account that will receive payments).

## 1. Create the apps and ad units

AdMob → Apps → **Add app** (twice: Android, then iOS). If the app isn't in the stores yet, choose "No" for "published", then link it later.

For each app, Ad units → **Add ad unit**:

| Ad unit                | Format       | Notes                                                                         |
| ---------------------- | ------------ | ----------------------------------------------------------------------------- |
| DietBuddy Banner       | Banner       | Used on Home, Progress and onboarding                                         |
| DietBuddy Interstitial | Interstitial | Shown once before the body scan                                               |
| DietBuddy Rewarded     | Rewarded     | Reward amount 1, item "Unlock". Turn on **Server-side verification** (step 3) |

Copy the IDs into `.env` and the EAS environment variables:

```
ADMOB_ANDROID_APP_ID=ca-app-pub-XXXX~YYYY      # App ID (with ~), used at build time
ADMOB_IOS_APP_ID=ca-app-pub-XXXX~ZZZZ
EXPO_PUBLIC_ADMOB_ANDROID_BANNER=ca-app-pub-XXXX/...
EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL=ca-app-pub-XXXX/...
EXPO_PUBLIC_ADMOB_ANDROID_REWARDED=ca-app-pub-XXXX/...
EXPO_PUBLIC_ADMOB_IOS_BANNER=ca-app-pub-XXXX/...
EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL=ca-app-pub-XXXX/...
EXPO_PUBLIC_ADMOB_IOS_REWARDED=ca-app-pub-XXXX/...
```

Development builds (`__DEV__`) always use test units, whatever is set here. Rebuild the app after changing the app IDs (they're compiled into the native project).

## 2. Consent messages (GDPR, required in the EU/UK)

AdMob → **Privacy & messaging**:

1. **European regulations** → create a GDPR message for both apps. Choose "Consent or Manage options", add your privacy policy URL, and publish.
2. Optionally **US state regulations** for US users.

The app shows this message (Google UMP) before any ad request, and mirrors the personalisation choice into `consents` (`ads_personalization`). When UMP says so, Profile shows "Ad privacy choices" so users can change their answer.

## 3. Reward verification (server-side)

1. Deploy the function: `npx supabase functions deploy admob-ssv` (it runs without a Supabase JWT; Google signs the request instead).
2. AdMob → your Rewarded ad unit → **Server-side verification** → callback URL:
   `https://<project-ref>.supabase.co/functions/v1/admob-ssv`
   AdMob sends a test request when you save; the function answers 200.
3. Rewards are written to `ad_unlocks` only when Google's signature checks out; the database then adds the XP (+15 per meal of the plan, +100 AI plan). The app never writes rewards itself.

## 4. Test on a device

1. Build a development client: `npx eas build --profile development --platform android` (or ios).
2. Add your device as a **test device**: AdMob → Settings → Test devices (or tap the ad inspector). Test ads are labelled "Test Ad".
3. Check: the consent form appears on first launch (use an EU VPN or the UMP debug geography), banners show for a free user and disappear after buying Premium, "Your AI Plan" offers the video with a Skip button, and `ad_unlocks` gets a row after watching.

## 5. Store declarations

- **Google Play Console** → App content: **Ads** = "Yes, my app contains ads"; **Data safety**: Device or other IDs (advertising ID) collected for advertising, shared with Google; **Advertising ID** declaration = used for advertising.
- **App Store Connect** → App Privacy: "Identifiers → Device ID" and "Usage Data → Advertising Data", used for third-party advertising. The app doesn't show Apple's tracking prompt (ATT), so iOS ads are served without the IDFA.
- Publish an **app-ads.txt** file on your website (AdMob → Apps → app-ads.txt) once the store listing links to your site.

Health data is never sent to ad networks: requests carry only the personalisation flag, with no keywords or content URLs (`src/lib/ads/config.ts`).
