# Third-party setup, in order

The app runs without any of these (features that need them say so). Do them in this order; each guide lists exactly what to click.

| #   | Account                                | Cost                        | Unlocks                                                   | Guide                            |
| --- | -------------------------------------- | --------------------------- | --------------------------------------------------------- | -------------------------------- |
| 1   | **Supabase** project (EU region)       | Free tier                   | Sign-up, all data, Edge Functions                         | `../backend.md`                  |
| 2   | **USDA FoodData Central** API key      | Free                        | Food search, AI meal plan numbers                         | `../backend.md` (Edge Functions) |
| 3   | **Anthropic** API key                  | Pay per use                 | AI coach, AI meal plans                                   | `../backend.md` (Edge Functions) |
| 4   | **Expo** account + `eas init`          | Free                        | Device builds, push tokens                                | `push.md` §1                     |
| 5   | **Apple Developer Program**            | $99/year                    | iOS builds, Sign in with Apple, HealthKit, App Store      | `revenuecat.md`, `health.md`     |
| 6   | **Google Play Console**                | $25 once                    | Android release, Play Billing, Health Connect declaration | `revenuecat.md`, `health.md`     |
| 7   | **RevenueCat**                         | Free to $2.5k/month revenue | Premium subscriptions                                     | `revenuecat.md`                  |
| 8   | **Google AdMob**                       | Free (you earn)             | Ads for free users                                        | `admob.md`                       |
| 9   | **Firebase** (for Android push)        | Free                        | Android push notifications                                | `push.md` §2                     |
| 10  | Google Cloud OAuth clients             | Free                        | Sign in with Google                                       | `../auth.md`                     |
| 11  | **Brevo** (email) and **sms.to** (SMS) | Free tier / pay per SMS     | Email codes for real users; phone sign-up codes           | `email-sms.md`                   |

Before store submission you also need live **Terms** and **Privacy Policy** pages (`EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_PRIVACY_URL`) that describe health data, AI processing (Anthropic), ads (Google) and purchases (RevenueCat).
