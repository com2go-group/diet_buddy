# Store listing texts

Copy these into App Store Connect and Google Play Console. Character limits are noted; the texts
fit them. They describe only what the app does today (CLAUDE.md §9 and §12: no medical claims, no
unbuilt features, no hardcoded prices).

Graphics are in `graphics/`, screenshots in `screenshots/`.

## App Store (App Store Connect)

| Field                               | Value                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| Name (30)                           | DietBuddy.me ("DietBuddy" is taken on the App Store)                                              |
| Subtitle (30)                       | Calorie & macro plan, AI coach                                                                    |
| Primary category                    | Health & Fitness                                                                                  |
| Secondary category                  | Food & Drink                                                                                      |
| Keywords (100, comma-separated)     | `calorie counter,macro tracker,meal plan,diet,weight loss,food log,barcode,protein,water,fitness` |
| Support URL                         | https://dietbuddy.me                                                                              |
| Marketing URL                       | https://dietbuddy.me                                                                              |
| Privacy Policy URL                  | https://dietbuddy.me/privacy.html                                                                 |
| License Agreement (App Information) | Custom: paste the Terms from https://dietbuddy.me/terms.html, or keep Apple's standard EULA       |
| Copyright                           | 2026 [your company name]                                                                          |
| Price                               | Free (Premium is an in-app subscription)                                                          |
| Age rating                          | 18+ (`age-rating.md`)                                                                             |

### Promotional text (170, can be changed without a new review)

```
Your personal calorie and macro plan, built from your body and goals. Log food in seconds, chat with your AI coach and watch your progress add up.
```

### Description (4000)

```
DietBuddy turns your goals into a clear daily plan, then helps you stick to it.

YOUR PERSONAL PLAN
Tell DietBuddy about your body, goal, activity, diet style, allergies and foods you avoid. You get daily calorie, protein, carb, fat, fibre and water targets, a realistic timeline and a weekly exercise suggestion. Targets never go below safe minimums, and fast weight-loss paces come with a clear caution.

EASY LOGGING
• Search a large food database, scan a barcode, or snap a photo of your plate
• Log water with one tap
• Re-log recent foods in any amount
• Nutrition numbers come from food databases (USDA FoodData Central and Open Food Facts), never invented

AI MEAL PLANS
Daily meal plans built around your targets, diet style and restrictions. Every plan is checked in code against your allergies and avoided foods before you see it.

AI COACH
Chat with three coaches: Aria (nutrition), Max (fitness) and Luna (mindset and wellbeing). They know your targets and recent days, and are built to be supportive, never extreme.

PROGRESS YOU CAN SEE
• Weight trend, weekly calories and goal projection
• Daily score, streaks, XP, levels and achievements
• Daily check-in for mood, energy, sleep and hunger
• Private progress photos
• Your Digital Twin: a cartoon avatar that follows your body composition over time
• A shareable weekly story of your progress

WORKS WITH APPLE HEALTH
Import weight, body fat, steps, active energy and water, and save the weight and water you log. Smart scales and watches that sync with Apple Health work too. Health data is never used for advertising.

PREMIUM
Premium removes ads and adds:
• Unlimited AI coach messages
• Full AI meal plans every day, planned up to 7 days ahead
• AI body scan from two photos (the photos are not stored)
• Restaurant mode: scan a menu and see the dishes that best fit your plan
• Grocery AI: a weekly shopping list from your meal plans
• AI insights and wellness insights
• Before and after photo comparison, Digital Twin timeline and weekly story sharing
• More food photo scans and priority support

Premium is available as a monthly subscription with a 7-day free trial, or as an annual subscription. Prices are shown in the app before you buy. Payment is charged to your Apple Account at confirmation of purchase or when the free trial ends. The subscription renews automatically unless cancelled at least 24 hours before the end of the current period. Manage or cancel it in your Apple Account settings.

YOUR DATA
Your data is stored in the EU. You can export it or delete your account at any time in the app.

DietBuddy is for adults (18+). It gives general nutrition and fitness information and is not medical advice. Talk to a doctor before starting a new diet, and DietBuddy is not suitable for people with, or recovering from, an eating disorder.

Terms of Service: https://dietbuddy.me/terms.html
Privacy Policy: https://dietbuddy.me/privacy.html
```

### What's New (first version)

```
Welcome to DietBuddy!
```

### App Review Information

- **Sign-in required:** Yes. Create a demo account in the released build (TestFlight) with an
  email address you control, finish onboarding, log a few foods and water, and enter it here.
  Don't use your personal account.
- **Contact:** your name, phone and email.
- **Notes** (paste and adjust):

```
DietBuddy is a nutrition and fitness tracker for adults (18+).

Demo account: see the sign-in fields above. It has completed onboarding. To test onboarding yourself, create a new account (email sign-up sends a 6-digit code).

Where to find things:
- Apple Health: Profile > Health apps > Connect. DietBuddy reads weight, body fat, steps, active energy and water, and writes weight and water. Health data is never used for advertising or shared with ad networks.
- Premium subscription: Profile > Upgrade, or Home > Subscribe. Restore purchases is on the paywall and in Profile.
- Account deletion: Profile > Privacy & Data > Delete account (type DELETE). Data export is on the same screen.
- AI features (coach, meal plans, photo scans) use Anthropic's Claude on our servers. Calorie and nutrient numbers come from USDA FoodData Central and Open Food Facts, not from the AI.
- Safety: calorie targets never go below 1,200/1,500 kcal or the user's BMR; the coach refuses extreme restriction and points to professional help.
- Ads (free plan): Google AdMob, always non-personalised on iOS; no App Tracking Transparency prompt because we don't track.
- The app does not provide medical advice; disclaimers are shown in onboarding, the plan and the coach.
```

## Google Play (Play Console → Grow → Store presence → Main store listing)

| Field                  | Value                                                                            |
| ---------------------- | -------------------------------------------------------------------------------- |
| App name (30)          | DietBuddy: Nutrition Coach                                                       |
| Short description (80) | Personal calorie & macro plan, easy food logging, AI coach and visible progress. |
| App icon               | `graphics/play-icon-512.png` (512 × 512)                                         |
| Feature graphic        | `graphics/play-feature-graphic-1024x500.png` (1024 × 500)                        |
| Phone screenshots      | `screenshots/android-phone/*.png` (1080 × 1920, 2–8 needed)                      |
| Category               | Health & Fitness                                                                 |
| Tags                   | Calorie counter, Diet & nutrition, Weight loss (pick the closest offered)        |
| Contact email          | your support email                                                               |
| Website                | https://dietbuddy.me                                                             |
| Privacy policy         | https://dietbuddy.me/privacy.html                                                |

### Full description (4000)

Use the App Store description above with these two changes:

- Replace the "WORKS WITH APPLE HEALTH" paragraph with:

```
WORKS WITH HEALTH CONNECT
Import weight, body fat, steps, active energy and water, and save the weight and water you log. Smart scales and watches that sync with Health Connect (including Samsung Health) work too. Health data is never used for advertising.
```

- Replace the subscription paragraph with:

```
Premium is available as a monthly subscription with a 7-day free trial, or as an annual subscription. Prices are shown in the app before you buy. Payment is charged to your Google Play account. The subscription renews automatically unless cancelled before the end of the current period. Manage or cancel it in Google Play > Payments & subscriptions.
```

### App access (Play Console → App content → App access)

"All or some functionality is restricted" → add the same demo account and a short instruction:
"Sign in with email and password. Onboarding is already completed."
