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
| Nutrition data | USDA FoodData Central (primary); Open Food Facts for barcodes and packaged foods |
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
npm run db:start          # local Supabase stack (needs Docker Desktop)
npm run db:reset          # re-apply migrations + seed.sql
npm run db:test           # pgTAP tests in supabase/tests (local stack)
npm run db:test:plain     # same tests on plain Postgres + pgTAP, no Docker (DATABASE_URL)
npm run db:types          # regenerate src/lib/supabase/database.types.ts after a migration
npx supabase functions serve
```

Backend setup, the access model and the no-Docker test path are in `docs/backend.md`; auth providers and their setup in `docs/auth.md`. Every migration that changes personal data must update `docs/data-inventory.md` and add pgTAP tests.

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

Prices (configure in App Store Connect / Play Console and RevenueCat, never hardcode): Monthly $9.99 with 7-day free trial; Annual $71.88 ($5.99/mo). The Lifetime plan was removed (decision log 2026-09-28).

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
- Accessibility state uses `aria-*` props (`aria-checked`, `aria-selected`, `aria-disabled`, `aria-busy`, `aria-expanded`), not `accessibilityState`: React Native Web ignores `accessibilityState`, so states would be lost on web. Radios use `aria-checked`.
- `Text` drops its variant's size, line-height and weight classes, and its tone colour, when `className` sets its own; two classes from one group would otherwise be resolved by stylesheet order.
- Don't pass a style function to a `Pressable` that also has `className` (NativeWind drops it); use a style object and `active:` classes.
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

1. ~~AI camera body scan approach.~~ Decided 2026-09-28: both (in-house estimate first, licensed SDK behind an adapter).
2. ~~Free-tier coach message limit per day.~~ Decided 2026-09-25.
3. ~~Meal-plan ad unlock per meal or per day.~~ Decided 2026-09-28: per meal.
4. ~~LLM provider/model~~ (decided 2026-09-25); ~~monthly AI budget~~ decided 2026-09-28: no cap, editable in the admin dashboard.
5. ~~Nutrition API beyond USDA.~~ Decided 2026-09-28: Open Food Facts for barcodes; FatSecret or national tables (CIQUAL, NEVO, CoFID) later if coverage needs it.
6. ~~Gender options beyond male/female and how BMR handles them.~~ Decided 2026-09-25.
7. ~~Human coaching.~~ Decided 2026-09-28: not in scope.
8. ~~Lifetime plan.~~ Decided 2026-09-28: removed.
9. ~~SMS provider.~~ Decided 2026-09-28: sms.to, no limit, changeable in the admin dashboard.
10. ~~Transactional email provider.~~ Decided 2026-09-28: Brevo.

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
| 2026-09-25 | Server-owned data is read-only to the app via column/table privileges: `is_premium`, `xp`, `streak_days`, meal plans, coach messages, achievements unlocked, ad unlocks. XP/streak/weight-trend/consent-audit logic runs in database triggers | Anti-tamper (§7.15) and one place for the rules; see `docs/backend.md` |
| 2026-09-25 | Schema additions beyond §10: `profiles.onboarding_step` (resume), `goals.motivation_other`, `consent_events` (GDPR audit trail), `app_config` (tunable limits), `ai_usage` (token logging, §11), `body_metrics.checkin_id` (check-in weight → trend) | Needed by §7.2, §7.9, §11, §13 |
| 2026-09-25 | "Clean Eater" copy is "5 days within your calorie target" (prototype said "under") | Don't reward undereating (§9) |
| 2026-09-25 | Owner has no Supabase project yet; schema is built and tested locally, hosted project to be created before auth goes live (steps in `docs/backend.md`) | Unblocks Phase 1 without an account |
| 2026-09-25 | App identifier `com.com2go.dietbuddy` (iOS bundle ID and Android package); project name stays `diet-buddy` | Owner chose "diet-buddy"; store IDs must be reverse-DNS and Android disallows hyphens |
| 2026-09-25 | Sign-up verification: user picks Email or Phone; 6-digit code by email or SMS typed into the app; email confirmation required. Apple/Google skip it (provider-verified) | Owner decision; codes avoid deep-link problems on mobile |
| 2026-09-25 | Date of birth collected at sign-up and enforced by the database when the account is created; Apple/Google users give it in onboarding | 18+ age gate "at signup" (§9) that can't be bypassed via the API |
| 2026-09-25 | Sign in with Apple on iOS only; Google via `@react-native-google-signin/google-signin`; both through `signInWithIdToken`. Buttons appear only when configured | Native flows; Apple requires its button on iOS alongside Google |
| 2026-09-25 | Sign-up subtitle "Free to start. No credit card required." replaces the prototype's "Start your 7-day free trial today" | The trial belongs to Premium; promising it at sign-up would mislead (store rules, §12) |
| 2026-09-25 | Added dependencies for auth: `@supabase/supabase-js`, `react-hook-form`, `zod`, `@hookform/resolvers`, `expo-apple-authentication`, `expo-crypto`, `@react-native-google-signin/google-signin` | Implement the §3 stack's auth and forms choices |
| 2026-09-25 | Onboarding adds a **health-data consent** step right after "personal" (before any body data), and asks **date of birth** instead of age (prefilled from sign-up). Declining blocks onboarding; sign-out is offered | §13 explicit, separate consent before collecting special-category data; §9 age gate |
| 2026-09-25 | Health-app and device steps say plainly that syncing arrives with HealthKit / Health Connect (Phase 2) and list devices as supported through them; no simulated "Connected"/"Paired" states. Google Fit removed | §7.12; don't show fake connections |
| 2026-09-25 | Onboarding saves each step to its table (profile, consent, goal, preferences) plus `profiles.onboarding_step`; finishing writes the first `body_metrics` row and `plans` v1, then sets `onboarding_completed_at` (last). Routing sends signed-in users to onboarding until that is set | §7.2 resume; a failure part-way leaves the user in onboarding to retry |
| 2026-09-25 | Pace and goal-date previews assume Lightly Active until the activity step is answered (as the prototype did); the final plan uses the real answer | Activity is asked after pace in the prototype's order |
| 2026-09-25 | Imperial units offered in onboarding (lb, ft/in); values are stored metric with `profiles.units` | §1 |
| 2026-09-25 | Consent is recorded with the `set_consent()` RPC, not an upsert | An upsert would need update rights on `user_id`/`consent_type`, which users deliberately don't have |
| 2026-09-25 | Added `@tanstack/react-query` (in the §3 stack) for server state | Profile and onboarding data |
| 2026-09-26 | Onboarding flow is questions → body scan → initial plan → app; `profiles.onboarding_step` is `bodyScan` / `initialPlan` for the last two, and `onboarding_completed_at` is set by the initial plan's "Start My Journey". Ads between screens come with Phase 2 | §6; resume works at every screen |
| 2026-09-26 | Body scan: manual entry only; the AI camera scan card shows "Coming soon · Premium" (§17 decision 1 default). Manual entry asks weight/height (prefilled) plus optional waist, neck and hips; chest was dropped (no formula uses it). Hips and neck are used for the calculation but not stored | Data minimisation (GDPR) |
| 2026-09-26 | Body fat uses the U.S. Navy tape method when waist + neck (+ hips for women) are given, else the BMI-based estimate; the method is shown to the user. Edited values override calculated ones and dependants follow (fat/lean mass from body fat, TDEE from BMR); edited BMR/TDEE feed the plan, with safety floors still applied | §7.3; see `docs/nutrition-model.md` |
| 2026-09-26 | Initial plan: rule-based weekly exercise recommendation from training frequency and goals (burn shown as an estimate, never added to food targets); forecast milestones (−1 kg, halfway, goal) and a projected-weight line from the capped weekly rate. The prototype's hard-coded sample meals are omitted until AI meal plans (Phase 2) | §7.4; no invented food data (§9) |
| 2026-09-26 | Contrast: brand amber `#F59E0B` is ~2:1 on light surfaces, so light mode uses `primary-text` (`#B45309`, ≥4.5:1) for text and darker accent shades (≥3:1) for large numbers; dark mode keeps the prototype colours. Enforced by `accents.test.ts` | §5 WCAG AA |
| 2026-09-26 | Main app shell: custom bottom tab bar (Home, Meals, Coach, Progress, Profile) with the notification bell on each tab; Meals, Coach, Progress and Profile are placeholders until items 9–12; sign-out lives on the Profile tab for now | §6; each tab gets its real screen in its own build step |
| 2026-09-26 | Home "Today's Score" = adherence score (calories 40%, protein 25%, water 25%, check-in 10%; full calorie credit up to 110% of target, then tapering), computed on the device from the day's logs; no score until something is logged | §7.5; see `src/lib/nutrition/adherence.ts` |
| 2026-09-26 | Home coach tip is rule-based until the AI coach (item 11): gentle prompts only, never "eat less"; Grocery AI, Restaurant and Subscribe shortcuts open a "Coming soon" sheet | No invented AI output (§9); those screens are Phases 2–3 |
| 2026-09-26 | Water is logged in 250 ml glasses; tapping a filled glass removes the most recent log | Matches the prototype's glass tracker; mistakes are easy to undo |
| 2026-09-26 | Check-in: the prototype's five questions, weight optional and prefilled from the latest reading, stored in the user's units. It saves the device's local date; the database accepts only today ±1 day and awards the XP. Aria's reply is templated, and the low-mood reply was changed from "I'll adjust your meal timing" to supportive wording | §7.9, §7.15 anti-tamper, §9 (no AI claims before the coach exists) |
| 2026-09-26 | Food search goes through a `food-search` Edge Function (USDA key stays on the server); results are per 100 g with USDA household servings, and search-logged foods are stored in grams with `food_ref = usda:<fdcId>`. Recent foods (last 30 days) can be re-logged in any amount | §9 nutrition numbers from the database; §11-style key handling |
| 2026-09-26 | Meals tab shows logged food per meal with a suggested split of the daily target (breakfast 25%, lunch 30%, snack 10%, dinner 35%), and can log for earlier days (at the meal's usual time). AI meal plans, suggestions, blur/ad unlock and the photo scan are Phase 2–3 and are not shown | §7.6; no mock plans |
| 2026-09-26 | Edge Functions are split into a Deno `index.ts` and a testable `handler.ts`; `npm run typecheck` covers them via a Deno type shim | No Deno needed on Windows; functions get unit tests |
| 2026-09-26 | Achievements unlock in the database (`evaluate_achievements` trigger after food, water, check-in and weight inserts) with XP and an in-app notification; the app only reads progress via `my_achievement_progress()`. Rules in `docs/backend.md` | §7.15 anti-tamper; Phase 3's XP work builds on it |
| 2026-09-26 | Progress tab: Overview (total lost, streak, 7-day average calories, check-ins this month instead of the prototype's "Workouts" until HealthKit/Health Connect, weight trend, weekly calories, goal projection from the plan's rate plus the user's actual trend), Body (metrics and change since first entry; photos are Phase 3), Achievements, Insights | §7.8; no workout data exists yet |
| 2026-09-26 | Progress insights are rule-based from the last 14 days (protein, calorie timing, hydration, weekend calories, sleep vs energy), each needing 5+ days of data; AI-written insights are Phase 3 | No invented insights (§9) |
| 2026-09-26 | Charts are drawn with react-native-svg (already installed) instead of adding victory-native | Two simple charts don't justify a new dependency |
| 2026-09-26 | AI coach: one `coach-chat` Edge Function for all three personas, each with its own system prompt in `_prompts/coach.v1.ts` sharing the safety rules; replies are JSON `{reply, safety}` validated with zod (one retry). A keyword screen in code adds professional-help notes for disordered eating or crisis regardless of the model. Limits (free 5/day from `app_config`, 6/min burst for all) are enforced in the function; the app shows the remaining count only | §7.7, §9, §11 |
| 2026-09-26 | Coach model defaults to `claude-sonnet-5`, set by the `COACH_MODEL` secret (e.g. `claude-haiku-4-5-20251001` to cut cost). One stored conversation per persona is resumed; "new conversation" starts another | Monthly AI budget is still open (§17.4) |
| 2026-09-26 | The coach may discuss the user's targets and totals but is told not to state calorie/macro numbers for specific foods, and to point to food search instead | §9 numbers come from the database |
| 2026-09-26 | Profile: header stats, check-in shortcut, Premium card (purchases and restore arrive with RevenueCat in Phase 2), notifications row explains push arrives in Phase 2, theme (system/light/dark), units, calorie and water goals editable (new plan version; calories never below max(sex floor, BMR), macros recomputed), FAQ, rate (after store launch), terms/privacy links when configured, version, sign out. Weight goal/pace editing is not in-app yet | §7.14; safety floors (§9) |
| 2026-09-26 | Privacy & Data: health-data consent shown with its date and withdrawn by deleting the account; analytics and marketing toggles via `set_consent`; ad personalisation left to UMP (Phase 2); JSON export via `export-data` (download on web, share sheet on phones via `expo-file-system` + `expo-sharing`); account deletion via `delete-account` after typing DELETE, effective immediately | §13 GDPR; App Store in-app deletion |
| 2026-09-26 | Added `expo-file-system` and `expo-sharing` (Expo SDK modules) | Saving and sharing the data export on iOS/Android |
| 2026-09-26 | White text on brand amber is ~2:1, so the coach's user bubbles use #B45309 and the Premium card is dark with amber text | §5 WCAG AA |
| 2026-09-27 | Subscriptions: `react-native-purchases` (RevenueCat) behind `src/lib/purchases`; app user ID = Supabase user ID. Premium in the app = server `is_premium` (webhook) OR the device's active `premium` entitlement, so it unlocks right after purchase. `revenuecat-webhook` applies events through `apply_premium_event` (newest `premium_event_at` wins; transfers move premium) | §12 |
| 2026-09-27 | Paywall lists only what Premium includes today (no ads, unlimited coach, full AI meal plans, priority support); unbuilt features are listed under "Coming to Premium". The prototype's testimonials and "users" counter are omitted | Store rules and consumer law: no fake reviews or unavailable paid features |
| 2026-09-27 | Added `expo-dev-client` and `eas.json` (development / preview / production profiles); store purchases, ads, push and health data need a development build | §3 EAS Build |
| 2026-09-27 | Step-by-step third-party setup guides live in `docs/setup/` | Owner has no store/RevenueCat/AdMob accounts yet |
| 2026-09-27 | Ads: `react-native-google-mobile-ads` behind `src/lib/ads` (web build has no ads). UMP consent runs for signed-in free users before any request; the choice is mirrored to `consents`. Placements: slim banner in onboarding, banners at the bottom of Home and Progress (with "Remove ads with Premium"), one interstitial between the questions and the body scan, opt-in rewarded "Your AI Plan" gate (Skip always available), and the meal-plan unlock (per day) for P2.5 | §6, §12; §17.3 default: per day |
| 2026-09-27 | Rewards are recorded only by `admob-ssv` from Google's signed SSV callback (userId + customData `{type, target}`); the app just waits for the row. Meal-plan targets must be today ±1 day | §12 anti-tamper; XP from the existing trigger |
| 2026-09-27 | No iOS ATT prompt for now: iOS ads are served without IDFA | Simpler review; can be added later with expo-tracking-transparency |
| 2026-09-27 | Push: `expo-notifications` + `expo-device`. Meal (8:30/12:30/19:00) and check-in (20:30) reminders are local daily notifications scheduled on the device from `notification_preferences`; achievements, streak milestones, the weekly report and promotions (marketing consent required) are `notifications` rows sent by `push-dispatch` (pg_cron, every 5 min) via Expo push. Coach-tip pushes are not built yet | §7.13 |
| 2026-09-27 | New tables `push_tokens` and `notification_preferences` (own-row RLS; exported by `export-data`); `notifications.pushed_at`; `register_push_token()` moves a device's token to the signed-in account; signing out removes the token and cancels reminders | Shared phones mustn't get the previous user's pushes |
| 2026-09-27 | Health: `@kingstinct/react-native-healthkit` (+ `react-native-nitro-modules`) on iOS and `react-native-health-connect` on Android behind `src/lib/health` (web: none); `expo-build-properties` sets Android minSdk 26. Reads weight (imported to `body_metrics`, de-duplicated against existing entries including our own write-backs), body fat, steps, active energy, water; writes check-in weight and water glasses. Steps/active energy are shown on Home but never added to the calorie target. Sync on sign-in and app foreground (≤ every 30 min) | §7.12, §9 |
| 2026-09-27 | Onboarding's health step now connects for real (optional); Profile → Health apps connects, syncs, disconnects and opens the health app. Scales and wearables are explained as working through the health store | §7.12 |
| 2026-09-27 | AI meal plans: `generate-meal-plan` — the model only chooses foods and grams; numbers come from USDA generic foods; `dietRules.ts` validates every item (name and USDA description, whole-word, cautious) against allergies, restrictions, diet style and avoided foods and forces a regeneration with feedback on any violation (max 3 attempts, then a clear error, never an unchecked plan); portions scaled to each meal's share of the target (factor 0.6–1.6) | §9 non-negotiables |
| 2026-09-27 | Meal plan in the Meals tab per meal: free users see the first item, the rest unlocks for the day via an opt-in rewarded video (+50 XP, verified by SSV) or Premium; web free users see "Unlock with Premium". Items can be logged (source `plan`). One plan per day; Premium can make up to 3 new ones. Swaps and plans for other days are not built yet | §7.6, §12; §17.3 per-day unlock |
| 2026-09-28 | XP for logging (+5 first food per meal slot per day, +10 water goal) recorded once in `xp_events`; levels derived from XP in the app (level n at 50·n·(n−1) XP); five more achievements (First Bite, Hydrated, Check-In Champ, Plan Follower, 30 Day Streak). Level shown on Home and Profile | §7.15; server-owned, can't be farmed by deleting and re-logging |
| 2026-09-28 | Food photo scan (Log Food → Photo): `expo-image-picker` (approved) takes or picks a compressed JPEG; `analyze-food-photo` sends it to Claude vision, which only names foods and estimates grams; numbers from USDA; allergy/restriction/avoid matches are shown as warnings and unmatched foods can't be logged from the scan; the user reviews grams and ticks items before logging (source `photo`). The photo is never stored. Free 3 scans/day (`app_config`), Premium 30/day | §7.6, §9 numbers from the database, §11 minimum data; not a Premium-only feature in §12 |
| 2026-09-28 | Progress photos in Progress → Body: upload to the existing private bucket (camera or library, JPEG metadata stripped on the device), gallery newest first, viewer with the weight within ±3 days and a two-tap delete (file, then row), signed URLs of 10 minutes refreshed every 5. Before/after (any two photos, days apart and weight change) is Premium; the gallery is free. Paywall lists before/after and 30 food scans/day as included | §7.8, §13 |
| 2026-09-28 | AI insights are Premium (free users keep the rule-based insights and see an upgrade card): `generate-insights` from 14 local days of aggregates only, at least 5 logged days, one set per day stored in `ai_insights` (server-written), restrictive advice screened in code (retry, then drop), shown with an "AI-generated · not medical advice" note | §7.8, §9, §11; cost control |
| 2026-09-28 | Grocery AI (Premium, Home → Grocery AI): plans the next 7 days (Premium meal plans may be made up to 7 days ahead; free stays today only), then `generate-grocery-list` sums the week's grams per food in code and the model only adds aisle, pack and a rough price in EUR (labelled as an estimate). One list per week in `grocery_lists`; users can only tick items. Future days' plans are shown on the Grocery screen; the Meals tab still shows today | §7.10, §9 (plans already allergy-checked), §12 |
| 2026-09-28 | Restaurant mode (Premium, Home → Restaurant): menu photo or typed dishes (no restaurant-name search: no menu database is available). The model only lists typical ingredients and grams; numbers from USDA, shown as estimates; allergy/restriction matches flagged and ranked last; ranked by fit to the meal's calories and protein. Logged dishes use new source `restaurant`. The Home "coming soon" sheet is gone | §7.11, §9 |
| 2026-09-28 | Owner decisions: body scan uses both an in-house estimate and a licensed SDK (behind an adapter) (§17.1); meal-plan ad unlock is per meal (§17.3); no monthly AI budget cap, to be editable in the admin dashboard (§17.4); European nutrition APIs to be evaluated alongside USDA (§17.5); no human coaching (§17.7); Lifetime plan removed (§17.8); SMS via sms.to with no limit, changeable in admin (§17.9); email via Brevo (§17.10) | Owner answers |
| 2026-09-28 | Phase 4 direction: AI Twin = cartoon avatar in three variants (male, female, other); Weekly Progress Story = a shareable image; Wellness Insights hub = insights drawn from AI coach chats; admin dashboard = admins only, covering price packages, users, pay codes, limits, analytics, content and support | Owner answers; details to confirm before building |
| 2026-09-28 | Clarifications: no pay codes and no price editing in the admin dashboard (store offer codes and store consoles are used instead); coach-chat analysis for wellness insights needs its own optional GDPR consent, asked in the onboarding consent step as a separate checkbox (consent can't be bundled into the T&C) and described in the Privacy Policy; per-meal ad unlock = +15 XP | Owner answers; GDPR Art. 9 explicit consent |
| 2026-09-28 | Lifetime plan removed from app, tests and setup guide; per-meal unlocks (`ad_unlocks.target_id` = `YYYY-MM-DD:slot`, checked by the database and `admob-ssv`); Brevo via Supabase SMTP; sms.to via a `send-sms` Send SMS hook with provider and sender in `app_config` | P4.1 |
| 2026-09-28 | Barcodes: Open Food Facts (free, EU-strong, ODbL: attribution shown with the numbers) via a `food-barcode` Edge Function; scanning with `expo-camera` (Expo SDK module, added) in Log Food → Search → Scan barcode, with a typed fallback (web: typed only). Logged as source `search`, `food_ref = off:<barcode>` | §17.5, §9 numbers from a database |
| 2026-09-28 | Admin dashboard: web-only `/admin` routes in the same Expo app (no second codebase), for signed-in admins after two-factor sign-in (Supabase MFA, authenticator app). Roles support < admin < owner in `admin_users`; every read/write via `admin_*` SQL functions or the `admin-users` Edge Function, which check role and `aal2`; changes audit-logged. Pages: overview + AI costs, users (detail, GDPR export, ban, delete, roles), support tickets, safety flags (metadata only), settings/limits/feature switches/min app version (validated allow-list), content (FAQ, achievements), push campaigns (marketing consent only), audit log. Setup: `docs/backend.md` → Admin access | P4.3 |
| 2026-09-28 | App side of the dashboard: Profile → Help is a screen (FAQ from `faq_entries`, else built-in; contact form → `support_tickets`; the user's requests with replies); feature switches `feature_barcode/food_photo/restaurant/grocery` (on unless false); `min_app_version` blocks older native builds with an update screen. Fixed: Profile now shows Health apps, Restore purchases (when the store is available) and ad privacy choices (when UMP requires them), which earlier steps had wired but not rendered | P4.3, §12 restore in Profile |
| 2026-09-28 | AI camera body scan (option A, owner's choice): Premium; separate `body_photos` consent (special category, withdrawable in Privacy & Data; `coach_insights` consent type added for P4.7); front + side photo framed neck-down, sent once to `analyze-body-scan` and never stored; the model only estimates waist/hip/neck (face visible → refused), the app applies the U.S. Navy formula and all values stay editable, labelled as an AI estimate ±3–5 cm. Available in onboarding (Premium users) and in Progress → Body → Body check (saves a new `body_metrics` row, source `scan` or `manual`). A licensed SDK can replace the estimator later | §7.3, §13, §17.1 |
| 2026-09-28 | Digital Twin (owner direction: cartoon, male / female / other): drawn in code with react-native-svg (no image model, no new dependency); fuller builds round the belly past the chest and thicken thighs, arms, face and chin. The build follows body fat (measured, else the BMI estimate) mapped to a per-variant range whose slim end is a healthy athletic level; the user picks style, skin tone (6) and hair colour (6), stored in `profiles.avatar` (validated by a check constraint). Timeline: first weigh-in, last weigh-in of each month between (max 10), now, and a projected goal (goal date, else the plan's weekly rate). Progress → Body → Your Digital Twin. Free users see and style their twin now; the timeline and goal projection are Premium. It is named "Digital Twin" in the app since no AI is involved; the paywall now lists the AI body scan and the twin as included | §7.16, §9 no extreme-leanness ideal, §12 |
| 2026-09-28 | Weekly Progress Story (owner direction: a shareable image): the last 7 days (today included) drawn as one SVG with react-native-svg and turned into a 1080×1920 PNG on the device (`toDataURL`; no new dependency), shared through the share sheet (web: Web Share with files, else a download). Shows streak, days logged, days within 90–110 % of the calorie target (undereating never counts), water goal days, check-ins, average daily score, this week's badges, level and the twin (optional). Weight change is off by default and only shared when the user turns it on. Nothing is uploaded or stored by the app. Progress → Overview → Share your week, and the weekly report push opens it. Preview for everyone; sharing is Premium. With it, every Premium feature on the paywall exists, so the "Coming to Premium" list is gone | §7.16, §9, §12, §13 data minimisation |
| 2026-09-28 | Wellness Insights hub (owner direction: insights from AI coach chats): Premium; needs the separate optional `coach_insights` consent, asked as its own unticked checkbox in the onboarding consent step (recorded either way, never bundled with the health-data consent or the T&C), in the hub before first use, and as a Privacy & Data toggle; withdrawing it deletes all wellness insights (trigger). `generate-wellness-insights` screens the user's own messages of the last 14 days in code first: signs of disordered eating or crisis → professional-help note, no model call, nothing stored. Otherwise only those messages go to Claude for 2–4 themed insights (sleep, stress, energy, mood, motivation, habits, nutrition, movement); restrictive advice and quotes (6+ words) are rejected in code; one new set per 7 days in `wellness_insights`, 4 calls/day cap. Hub: Coach header (sun icon) and Progress → Insights; theme filters, delete (two taps, no automatic regeneration), link to Privacy & Data | §7.16, §9, §11, §13 GDPR Art. 9 |
| 2026-09-28 | Privacy Policy and Terms: drafts written from the data inventory, kept in the app (`src/features/legal/*.en.ts`) and shown at public routes `/legal/privacy` and `/legal/terms` (before and after sign-in; the hosted web build gives the live store URLs). Company, address, contact email and governing-law country come from `EXPO_PUBLIC_LEGAL_*` (visible placeholders until set). Links are always shown at sign-up, onboarding consent and Profile, opening the configured URL or the in-app page. Legal review, DPAs and hosting steps in `docs/legal.md` | §7.1, §13, store submission |
| 2026-09-28 | Store privacy forms in `docs/store/` (Apple App Privacy, Google Data Safety, Health Connect declaration). iOS now always requests non-personalised ads (no ATT prompt), so the App Store label answers "no tracking"; halal/kosher restrictions are declared as possibly revealing religious beliefs. Public `/legal/delete-account` page for Play's deletion URL. Camera/photo permission texts corrected (scans not stored, progress photos kept) | §12, §13, store submission |
| 2026-09-28 | Accessibility pass (axe WCAG 2.1 AA on the web build, both themes; `docs/accessibility.md`): light `muted-foreground` `#5F6673` and `primary-text` `#A34A08` (were 3.9–4.4:1 on tinted panels); accent colours used as text now ≥4.5:1 (dark blue `#60A5FA`, violet `#A78BFA`, red `#F87171`; light red `#B91C1C`), rings keep the prototype colours; shared `SwitchRow` (row is the touch target); Twin timeline items are radios; coach prompts 44 pt | §5 WCAG AA |
