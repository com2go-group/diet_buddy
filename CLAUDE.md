# CLAUDE.md — DietBuddy

This file gives Claude Code the context needed to build DietBuddy. Read it fully before starting any task. Keep it updated as decisions are made (see "Open decisions" and "Decision log").

---

## 1. Project overview

**DietBuddy** is a personalized nutrition and fitness mobile app for iOS and Android. It offers AI-generated meal plans, calorie/macro tracking, body composition estimates, progress tracking, gamification and an AI coach with multiple personalities. It is freemium: the free tier is ad-supported, and Premium removes ads and unlocks advanced features.

- Language: English only (build with i18n-ready string handling so localization can be added later)
- Markets: initial launch includes the EU, so GDPR applies from day one
- Units: metric by default (kg, cm), with imperial as a user setting

## 2. Current state: the prototype

The folder `/prototype` contains a **web prototype exported from Figma Make** (React 18 + Vite + Tailwind + shadcn/ui). It is the **visual and flow reference only**:

- All data is hardcoded mock data. There is no backend, auth, AI, ads, payments or persistence.
- It renders inside a fake iPhone frame in a browser.
- Do **not** port it as-is or wrap it in a WebView. Rebuild each screen natively in React Native, matching its layout, copy, colors and flow.
- Treat the prototype's copy, option lists and screen order as the source of truth unless this file says otherwise.
- Never modify files in `/prototype`.

Key prototype files:

| Area | File |
|---|---|
| Flow/routing and ad placement | `prototype/src/app/App.tsx` |
| Onboarding (all steps + plan calc) | `prototype/src/app/components/OnboardingScreen.tsx` |
| Body scan | `BodyScanScreen.tsx` |
| Initial AI plan | `InitialPlanScreen.tsx` |
| Home dashboard | `HomeScreen.tsx` |
| Meals (blur + ad unlock) | `MealsScreen.tsx` |
| AI coach | `AICoachScreen.tsx` |
| Progress + achievements | `ProgressScreen.tsx` |
| Profile & settings | `ProfileScreen.tsx` |
| Daily check-in | `CheckInScreen.tsx` |
| Grocery AI | `GroceryScreen.tsx` |
| Restaurant mode | `RestaurantScreen.tsx` |
| Notifications | `NotificationsScreen.tsx` |
| Paywall | `SubscriptionsScreen.tsx` |
| Rewarded ad screen | `RewardAdScreen.tsx` |
| Banner ads | `BannerAd.tsx` |
| Auth / welcome | `AuthScreen.tsx`, `WelcomeScreen.tsx` |
| Design tokens | `prototype/src/styles/theme.css` |

## 3. Tech stack

| Concern | Choice |
|---|---|
| App framework | React Native with **Expo** (managed workflow + dev builds), TypeScript strict mode |
| Navigation | Expo Router (file-based) |
| Styling | NativeWind (Tailwind for RN), tokens from section 5 |
| Animation | react-native-reanimated; haptics via expo-haptics |
| Charts | victory-native (or react-native-gifted-charts if simpler) |
| Server state | TanStack Query |
| Local/UI state | Zustand |
| Forms & validation | react-hook-form + zod (share zod schemas with backend) |
| Backend | **Supabase**: Postgres, Auth, Storage, Edge Functions, Row Level Security |
| Auth providers | Email/password, Sign in with Apple, Google |
| AI | LLM API called **only from Supabase Edge Functions**, never from the app |
| Nutrition data | USDA FoodData Central (primary); a paid API (Edamam/Nutritionix) may be added for branded foods and barcodes |
| Ads | Google AdMob via `react-native-google-mobile-ads`, with Google UMP consent |
| Subscriptions | RevenueCat (`react-native-purchases`) over App Store / Play Billing |
| Health data | Apple HealthKit (iOS) and Health Connect (Android) |
| Push | Expo Notifications |
| Analytics / crash | PostHog (or Firebase Analytics) + Sentry |
| Testing | Jest + React Native Testing Library; Maestro for E2E flows |
| Builds & releases | EAS Build / EAS Submit |

Do not add major dependencies outside this list without asking first.

## 4. Commands

```bash
npm start                 # Expo dev server (Expo Go / dev client / web)
npm run web               # dev server in the browser
npm run ios               # native dev build (needed for ads, health, purchases)
npm run android
npm test                  # Jest (unit + component tests)
npm run lint              # eslint + prettier check
npm run format            # prettier --write
npm run typecheck         # tsc --noEmit
npx expo export --platform ios --platform android   # bundle check without a device
npx supabase start        # local backend (from Phase 1 item 4)
npx supabase functions serve
```

Expo SDK 57 (React Native 0.86, React 19.2, TypeScript 6). Install native packages with `npx expo install <pkg>` so versions match the SDK; if Expo's API is unreachable, pin the version listed in `node_modules/expo/bundledNativeModules.json`.

Development happens on **Windows**. iOS builds must go through EAS Build (cloud), not a local Mac. Prefer cross-platform scripts; avoid bash-only tooling in package.json scripts.

## 5. Design system

Match the prototype. Tokens (from `prototype/src/styles/theme.css`):

| Token | Light | Dark |
|---|---|---|
| background | `#F9F7F4` | `#0F172A` |
| foreground | `#1F2937` | `#F9FAFB` |
| card | `#FFFFFF` | `#1E293B` |
| primary | `#F59E0B` | `#F59E0B` |
| primary-foreground | `#FFFFFF` | `#FFFFFF` |
| muted | `#F3F4F6` | `#1E293B` |
| muted-foreground | `#6B7280` | `#94A3B8` |
| accent | `#FEF3C7` | `#2D1A00` |
| accent-foreground | `#92400E` | `#FDE68A` |
| destructive | `#EF4444` | `#EF4444` |
| border | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.08)` |

- Radius base 16px (sm 12, md 14, lg 16). Cards are rounded and softly shadowed.
- Primary gradient for main CTAs: `#F59E0B → #D97706`.
- Macro colors: protein `#10B981`, carbs `#3B82F6`, fat `#8B5CF6`. Success `#10B981`.
- Font: Inter. KPI numbers are large (40–56px) and bold.
- Motion: 250–420ms transitions; bottom-sheet overlays slide up with a spring. Haptics on significant actions (log meal, complete check-in, unlock achievement).
- Support light and dark mode, following the system by default with a manual override in Profile.
- Accessibility: WCAG AA contrast, accessibility labels on all interactive elements, dynamic type support, minimum 44pt touch targets.
- Every data screen needs **loading (skeleton), empty and error states**. The prototype mostly lacks these; design them consistently.

## 6. App flow

```
Welcome → Auth (signup | login)
  login  → Main app
  signup → Onboarding → [Interstitial ad, free only] → Body Scan
         → [Rewarded ad "Your AI Plan", free only, skippable] → Initial AI Plan → Main app

Main app (bottom tabs): Home | Meals | Coach | Progress | Profile
Overlays (slide-up sheets): Check-in, Notifications, Subscriptions (paywall),
                            Grocery, Restaurant, Rewarded ad
```

A notification bell sits top-right on all main-app screens.

## 7. Feature specification

### 7.1 Auth
Email/password (with confirm password, forgot password), Apple, Google. Link to Terms and Privacy Policy on signup. Account deletion must be available in-app (App Store requirement).

### 7.2 Onboarding
Steps are built dynamically (see `buildSteps` in the prototype):

1. **personal**: name, age, gender
2. **measurements**: height, weight; show live BMI
3. **goal**: multi-select: Lose Fat, Build Muscle, Body Recomposition, Improve Performance, Healthy Lifestyle
4. **goalWeight**: only if Lose Fat. Show amount to lose, goal BMI, estimated body fat
5. **pace**: only if Lose Fat. Sustainable (0.25 kg/wk) / Balanced (0.5 kg/wk, recommended) / Fast (0.75–1.0 kg/wk). Explain each and show a timeline chart comparing them
6. **goalDate**: 3 months / 6 months / 12 months / custom date
7. **motivation**: multi-select: Improve appearance, Improve health, Increase confidence, Build muscle, Sports performance, Special event, Other
8. **activity**: Sedentary (1.2), Lightly Active (1.375), Active (1.55), Very Active (1.725)
9. **trainingFreq**: 0–1, 2–3, 4–5, 6+ days/week
10. **dietStyle**: multi-select: No preference, Mediterranean, Vegetarian, Vegan, Keto, Low Carb
11. **restrictions**: Halal, Kosher, Gluten Free, Lactose Free, Other (free text)
12. **avoidFoods**: foods to avoid, grouped by category (meat, fish & seafood, dairy, carbs/grains, etc.)
13. **allergies**: including peanuts, tree nuts, dairy, eggs, fish, shellfish, soy, wheat/gluten, sesame, plus free text
14. **healthApps**: connect Apple Health / Health Connect
15. **devices**: smart scales and wearables (see 7.12)
16. **aiPlan**: plan overview (goal, current/goal weight, weekly rate, daily calories, protein target, estimated goal date, macro split, summary of motivations, activity, training, diet, restrictions, connected devices)

Progress must persist per step so a user can quit and resume.

### 7.3 Body scan
- Two modes: **Manual Entry** (free, default) and **AI Camera Scan** (Premium; see Open decisions, it may ship later).
- Results: Body Fat %, Lean Mass, Fat Mass, BMR, TDEE, BMI, each with an explanation. The user can **edit** every value; edited values override calculated ones.
- Composition breakdown (fat / muscle / water / bone) is an **estimate** and must be labelled as such.

### 7.4 Initial AI plan
Daily nutrition (calories, protein, carbs, fat, fiber, calorie deficit), daily hydration goal, weekly exercise recommendation, goal forecast chart.

### 7.5 Home
Greeting and date, Today's Score (adherence), calorie + macro rings, hydration tracker, today's meals, daily check-in card (+20 XP), AI coach insight card, weekly adherence chart, shortcuts to Grocery AI, Restaurant and Subscribe.

### 7.6 Meals
- Daily plan: Breakfast, Lunch, Snack, Dinner; calories today, macros, remaining.
- **Free tier**: each meal shows its first item; the rest is blurred with a "watch video to unlock" CTA (rewarded ad, +50 XP). Premium: no blur.
- Log food: search (nutrition database), manual entry, and **AI photo scan** of a plate.
- Meal swaps within the user's diet style, restrictions, avoid-list and allergies.

### 7.7 AI coach
Chat with three personalities, each with its own system prompt and tone:
- **Aria**: nutritionist
- **Max**: fitness coach
- **Luna**: wellness / mindset

The coach receives a compact summary of the user's profile, targets and recent logs. Free tier has a daily message limit (value TBD); Premium is unlimited. Conversations are stored.

### 7.8 Progress
Stats (total lost, streak, average calories, workouts), weight trend, weekly calories, goal projection, metrics (weight, BMI, waist, body fat), photo progress, achievements (e.g. 12 Day Streak, Clean Eater, Hydration Hero, Protein Pro, Scale Master, Two Week Warrior), and AI insights (best performance day, calorie timing, hydration pattern, protein gap, rest-day nutrition). Before/after comparison and advanced projections are Premium.

### 7.9 Daily check-in
Mood (Great/Good/Okay/Low/Tough), energy (1–10), sleep hours, hunger, optional weight. Awards XP and updates the weight trend.

### 7.10 Grocery AI (Premium)
Weekly shopping list generated from the meal plan, grouped by aisle, with checkboxes and an estimated weekly cost.

### 7.11 Restaurant mode (Premium)
Scan a menu with the camera (vision model) or search a restaurant/item. AI scores each dish against the user's remaining calories and protein for that meal and sorts by best match.

### 7.12 Health & device integrations
- Read/write weight, body fat, steps, active energy, workouts and water via **HealthKit** and **Health Connect**.
- Smart scales and wearables listed in onboarding (Withings, Garmin, RENPHO, Eufy, Xiaomi, Fitbit, Apple Watch, WHOOP, Oura, Polar, Galaxy Watch, Amazfit, Samsung Health) are supported **through HealthKit / Health Connect**, not individual APIs. The devices screen should explain this and deep-link to setup.
- Google Fit is being retired; do not integrate it. Samsung Health syncs via Health Connect.

### 7.13 Notifications
Meal log reminders, streaks, badges, coach tips, weekly progress report, premium feature promos. User-configurable in Profile.

### 7.14 Profile
Account, notifications, dark mode, **Privacy & Data** (GDPR: consent management, data export, account deletion), goals (weight goal, calorie target, hydration goal), help/FAQ, rate app, upgrade to Premium, app version.

### 7.15 Gamification
XP for check-ins, logging, ad unlocks; streaks; achievements. XP/streak logic lives on the server to prevent tampering.

### 7.16 Not yet designed (later phases)
Digital AI Twin / avatar, avatar timeline, Weekly Progress Story, Wellness Insights hub, admin dashboard (web). Ask for design direction before building these.

## 8. Domain logic

Put all calculations in a pure, fully unit-tested module (`src/lib/nutrition/`), shared with Edge Functions where possible.

- **BMR**: Mifflin-St Jeor. Male `10w + 6.25h − 5a + 5`, female `10w + 6.25h − 5a − 161` (w kg, h cm, a years). Define behavior for other/undisclosed gender (e.g. average of the two) and document it.
- **TDEE** = BMR × activity multiplier (section 7.2).
- **Pace → daily deficit**: derive from target rate: `dailyDeficit = weeklyKg × 7700 / 7`. So 0.25 kg/wk ≈ 275 kcal/day, 0.5 ≈ 550, 0.75 ≈ 825, 1.0 ≈ 1100.
- **Build Muscle**: surplus ~250 kcal/day. Recomposition: maintenance or small deficit.
- **Protein**: 1.8 g/kg (2.2 g/kg for Build Muscle). For users with high BMI, base protein on goal or adjusted body weight instead of current weight.
- **Fat**: ~30% of calories; **carbs**: remainder. Macro display percentages must be computed from the gram targets, not fixed.
- **Timeline**: `weeks = kgToLose / weeklyKg`.

### Known bugs in the prototype (do not replicate)
1. The prototype treats `deficit / 7700` as kg **per week**, but deficit is per **day**. Its timelines are about 7× too long.
2. Pace deficits are hardcoded at 250/500/750 kcal/day, which don't match the advertised 0.25/0.5/0.75–1.0 kg/week.
3. The macro split shows fixed 30/40/30% even though protein is calculated in g/kg, so the numbers disagree.

## 9. Safety and health guardrails (non-negotiable)

- Minimum calorie floors: never below 1,200 kcal/day (women) / 1,500 kcal/day (men), or BMR, whichever is higher. Warn when a chosen pace would breach it and cap the pace.
- Cap weekly loss at 1% of body weight. The "Fast" pace must show a caution.
- Age gate: 18+ at signup.
- Block weight-loss goals when goal BMI < 18.5; warn and suggest a professional when current BMI < 18.5.
- Show a "not medical advice" disclaimer in onboarding, plan and coach. No medical claims in copy.
- The AI coach must refuse to promote extreme restriction, purging, or dangerous supplements, and must point users to professional help if it detects signs of disordered eating. Include this in every coach system prompt and test it.
- All AI-generated meal plans must be validated against the user's **allergies and restrictions** in code after generation (not only by prompt). Reject and regenerate on any violation.
- Calorie/macro numbers shown for foods must come from the nutrition database, never invented by the LLM.

## 10. Data model (Supabase / Postgres)

All tables have `id uuid`, `created_at`, `updated_at`, and RLS so users can only access their own rows.

- `profiles`: user_id, name, birth_date, gender, height_cm, units, is_premium (synced from RevenueCat webhook), xp, streak_days, onboarding_completed_at
- `goals`: user_id, goal_types[], start_weight_kg, goal_weight_kg, pace, goal_date, motivations[], active
- `preferences`: user_id, activity_level, training_frequency, diet_styles[], restrictions[], restriction_other, avoid_foods[], allergies[], allergy_other
- `body_metrics`: user_id, measured_at, source (manual | scan | healthkit | health_connect), weight_kg, body_fat_pct, lean_mass_kg, fat_mass_kg, waist_cm, bmr, tdee, bmi, user_overridden bool
- `plans`: user_id, version, daily_calories, protein_g, carbs_g, fat_g, fiber_g, water_ml, exercise_recommendation jsonb, forecast jsonb, generated_by
- `meal_plans`: user_id, date, meals jsonb (slots → items with food refs and macros)
- `food_logs`: user_id, logged_at, meal_slot, food_ref, name, quantity, unit, calories, protein_g, carbs_g, fat_g, source (search | manual | photo | plan)
- `water_logs`: user_id, logged_at, ml
- `checkins`: user_id, date, mood, energy, sleep_hours, hunger, weight_kg
- `progress_photos`: user_id, taken_at, storage_path (private bucket)
- `coach_conversations` / `coach_messages`: user_id, persona (aria | max | luna), role, content, created_at
- `achievements` / `user_achievements`
- `ad_unlocks`: user_id, unlock_type (meal_plan | ai_plan), target_id, unlocked_at
- `notifications`: user_id, type, title, body, read_at
- `device_connections`: user_id, platform, connected_at, scopes
- `consents`: user_id, consent_type (health_data | ads_personalization | analytics | marketing), granted, version, updated_at

## 11. AI integration rules

- All LLM/vision calls go through Supabase Edge Functions. API keys never ship in the app.
- One function per capability: `generate-plan`, `generate-meal-plan`, `coach-chat`, `analyze-food-photo`, `analyze-menu`, `generate-grocery-list`, `generate-insights`.
- Request **structured JSON** output validated with zod; retry once on invalid output, then fail gracefully.
- Send the minimum user data needed. Never send names, emails or photos of faces to the LLM unless the feature requires it.
- Rate-limit per user; enforce free-tier limits server-side.
- Log token usage per user for cost monitoring.
- Keep prompts in versioned files under `supabase/functions/_prompts/`.

## 12. Monetization

### Tiers
**Free**: calorie & macro tracking, basic meal logging, basic AI tips, streaks, limited coach messages, ads.

**Premium**: everything in Free plus no ads, AI camera body scan, Digital AI Twin, Restaurant Mode, Grocery AI, before/after photos, unlimited coach, advanced analytics & projections, custom AI meal plans, weekly progress story, detailed body composition, priority support.

Prices (configure in App Store Connect / Play Console and RevenueCat, never hardcode): Monthly $9.99 with 7-day free trial; Annual $71.88 ($5.99/mo); Lifetime $149 one-time.

### Entitlements
- Single RevenueCat entitlement `premium`. The app checks entitlement via RevenueCat SDK; the backend trusts only the RevenueCat webhook.
- Include "Restore purchases" on the paywall and in Profile.
- Paywall copy must clearly state trial terms and renewal price (store requirement).

### Ads (free tier only)
- Interstitial/banner screen after onboarding, skippable, before body scan.
- Rewarded video before revealing the initial AI plan (skippable; plan is still shown if skipped).
- Rewarded video to unlock each day's full meal plan (+50 XP). Record unlocks in `ad_unlocks` so they persist.
- Banners on selected screens (see `BannerAd.tsx` variants).
- Rewarded ads must always be opt-in: the user taps to watch, and the reward is granted only on the AdMob reward callback.
- Use AdMob test IDs in development. Never tap live ads during testing.
- Show Google UMP consent before any ad request; respect the choice for personalized vs non-personalized ads.
- Health data must never be passed to ad SDKs or used for ad targeting.

## 13. Privacy and compliance

- GDPR: health data, body metrics and progress photos are special-category data. Collect **explicit, separate consent** for health data processing during onboarding, stored in `consents`.
- In-app data export (JSON) and account deletion (hard delete within 30 days, including storage files).
- Progress photos in a private Storage bucket, accessed via short-lived signed URLs.
- App Store privacy nutrition labels and Google Play Data Safety form must match actual data use. Keep a `docs/data-inventory.md` updated whenever data collection changes.
- HealthKit data must not be used for advertising or sold (Apple rule).
- Supabase project region: EU.

## 14. Project structure

```
/prototype                 # Figma Make reference (read-only)
/app                       # Expo Router routes
  (auth)/  (onboarding)/  (tabs)/  (modals)/
/src
  /components              # shared UI (Button, Card, KpiTile, Ring, Chip, Sheet, Skeleton, EmptyState, ErrorState)
  /features/<feature>/     # screens, hooks, api, types per feature
  /lib/nutrition           # pure calculation logic + tests
  /lib/supabase            # client, generated types
  /lib/ads  /lib/purchases  /lib/health
  /theme                   # tokens
/supabase
  /migrations  /functions  /seed.sql
/docs                      # decisions, data inventory
```

## 15. Conventions

- TypeScript strict; no `any`. Generate Supabase types (`supabase gen types`) after each migration.
- Feature-first folders. Keep components under ~200 lines; extract hooks for logic.
- All user-facing strings in a strings file (i18n-ready).
- Every calculation function has unit tests, including edge cases and safety floors.
- Each screen implements loading, empty and error states.
- Commits: conventional commits (`feat:`, `fix:`, `chore:`). Small, focused PRs.
- Secrets in `.env` (never committed); provide `.env.example`.
- Before finishing any task: run typecheck, lint and tests, and report results.
- Strings live in `src/i18n/en.ts`; read them with `t('section.key', params)`.
- Styling: NativeWind classes on plain RN components. Reanimated's `Animated.View` does not take `className`; put classes on an inner `View`. Use `src/theme/tokens.ts` only where a raw value is needed (SVG, charts, native APIs); `tokens.test.ts` keeps it in sync with `global.css`.
- Inter needs one font family per weight on native: use the `font-sans|medium|semibold|bold|extrabold` classes, not `fontWeight`.
- Tests: Testing Library 14 is async (`await render(...)`, `await fireEvent.press(...)`). Real Reanimated runs in Jest via the worklets resolver; AsyncStorage and haptics are mocked in `jest.setup.ts`.

## 16. Build phases

Work one phase at a time. At the start of each phase, propose a task breakdown and confirm it before coding.

**Phase 1 — Core MVP**
Expo scaffold, theme, shared components, Supabase setup + migrations + RLS, auth, onboarding (all steps, with resume), manual body scan with editable values, plan calculation, initial plan screen, home dashboard, food search + manual logging, water tracking, check-in, progress charts, AI coach chat (3 personas), profile/settings, consent flows, account deletion/export.

**Phase 2 — Monetization & platform**
RevenueCat paywall and entitlements, AdMob + UMP (interstitial, rewarded, banners, meal blur/unlock), push notifications, HealthKit + Health Connect, AI-generated daily meal plans.

**Phase 3 — Premium AI features**
Food photo analysis, Restaurant mode, Grocery AI, achievements/XP system, progress photos + before/after, AI insights.

**Phase 4 — Advanced**
AI camera body scan, Digital AI Twin, Weekly Progress Story, admin dashboard (web), analytics dashboards.

**Before store submission**: privacy policy and terms URLs live, data safety forms, screenshots, age rating, accessibility pass, E2E tests on the signup → plan → log → paywall flows.

## 17. Open decisions

Ask the owner before making these choices; record answers in the decision log.

1. AI camera body scan: licensed SDK vs in-house estimate vs defer to Phase 4 (current default: defer, ship manual only).
2. ~~Free-tier coach message limit per day.~~ Decided 2026-09-25.
3. Whether meal-plan ad unlock is per meal or per day.
4. ~~LLM provider/model~~ (decided 2026-09-25); monthly AI budget still open.
5. Nutrition API beyond USDA (needed for barcode scanning and branded foods).
6. ~~Gender options beyond male/female and how BMR handles them.~~ Decided 2026-09-25.
7. Human coaching: in scope or not.
8. Whether the Lifetime plan stays (it creates long-term AI cost with no recurring revenue).

## 18. Decision log

| Date | Decision | Reason |
|---|---|---|
| 2026-09-25 | React Native (Expo) rebuild instead of wrapping the web prototype | Native modules needed for ads, health, camera, purchases |
| 2026-09-25 | Wearables and scales via HealthKit / Health Connect only | One integration per platform instead of one per device |
| 2026-09-25 | Google Fit excluded | Being retired in favor of Health Connect |
| 2026-09-25 | Gender options: Male, Female, Other / prefer not to say. BMR for the third uses the average of the male and female Mifflin-St Jeor equations (constant −78); body-fat estimate and calorie floor (1,350) use the midpoint too | Neutral, documented default; see `docs/nutrition-model.md` |
| 2026-09-25 | Free-tier coach limit: 5 messages/day, stored in server config (not hardcoded in the app) | Easy to tune without an app release |
| 2026-09-25 | LLM: Claude via Supabase Edge Functions, behind a provider adapter so it can be swapped | Owner approved; keeps provider choice reversible |
| 2026-09-25 | Nutrition interpretation choices (fast pace scaling, recomposition rule, protein reference weight, water, fiber, body-fat formula) | Listed in `docs/nutrition-model.md` for owner review |
