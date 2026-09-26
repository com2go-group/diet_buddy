# Backend (Supabase)

The schema lives in `supabase/migrations`, reference data in `supabase/seed.sql`, and database tests in `supabase/tests/database` (pgTAP). The app talks to Supabase only through `src/lib/supabase`, using the anon key. Row level security limits every query to the signed-in user's rows.

## Creating the hosted project (one-time, owner)

1. Create an account at [supabase.com](https://supabase.com) (the free plan is enough for development).
2. **New project**, region **Central EU (Frankfurt)** or another EU region (CLAUDE.md §13). Save the database password in a password manager.
3. **Project Settings → API**: copy the Project URL and the anon (public) key into `.env` (see `.env.example`). Never put the service-role key in `.env` or in the app.
4. Link and push the schema from the repo:
   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```
5. Load the reference data (achievements, config) once: open **SQL Editor** in the dashboard and run the contents of `supabase/seed.sql`. It is safe to re-run.

Auth providers (Apple, Google), email templates and redirect URLs are set up with the Auth task (Phase 1, item 5).

## Local development (Windows)

The local stack runs in Docker. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/), start it, then:

```bash
npm run db:start      # starts Postgres, Auth, Storage…; prints the local URL and anon key
npm run db:reset      # re-applies all migrations and seed.sql
npm run db:test       # runs the pgTAP tests in supabase/tests
npm run db:types      # regenerates src/lib/supabase/database.types.ts after a schema change
npm run db:stop
```

Put the printed API URL and anon key in `.env` to point the app at the local stack.

### Without Docker

`npm run db:test:plain` runs the same migrations, seed and tests against any Postgres 15+ server that has pgTAP installed. It uses `scripts/db/supabase-stub.sql` to stand in for Supabase's `auth` and `storage` schemas. Set `DATABASE_URL` to a server where you can create databases; the script creates and drops a `dietbuddy_test` database. The real stack (`db:test`) remains the reference.

## Edge Functions

Server-side code that needs a secret or an outside API lives in `supabase/functions` (Deno). Each function has a thin `index.ts` (`Deno.serve`) and a `handler.ts` that takes its dependencies (keys, `fetch`, database client) as arguments, so Jest can test it (`supabase/tests/functions`). Shared, pure code is in `supabase/functions/_shared`. `npm run typecheck` also typechecks the functions using a small Deno type shim (`scripts/functions`), so no Deno install is needed on Windows.

| Function                | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Secrets                                                                         |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `food-search`           | Searches USDA FoodData Central and returns foods per 100 g with household servings. Only the search text is sent to USDA.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `USDA_API_KEY` (free key from [api.data.gov](https://api.data.gov/signup/))     |
| `food-barcode`          | Barcode lookup in Open Food Facts (GTIN check digit validated first); per-100 g numbers normalised like USDA (`_shared/openFoodFacts.ts`), products without plausible energy rejected; `food_ref = off:<barcode>`. Runs on the server so the device doesn't contact a third party.                                                                                                                                                                                                                                                                                                                               | optional `OFF_USER_AGENT`                                                       |
| `coach-chat`            | AI coach (Aria, Max, Luna). Checks the burst limit (6/min) and the free daily limit (`app_config.coach_daily_message_limit_free`), builds a de-identified context, calls Claude through the provider adapter (`_shared/llm.ts`), validates the JSON reply (one retry), adds professional-help notes in code when a message shows signs of disordered eating or crisis, stores both messages and logs token usage to `ai_usage`. Prompts: `_prompts/coach.v1.ts`.                                                                                                                                                 | `ANTHROPIC_API_KEY`; optional `COACH_MODEL` (default `claude-sonnet-5`)         |
| `export-data`           | GDPR export: the account (email/phone, created date) and every row from every table with a `user_id`, plus the list of Storage files, as one JSON document. A Jest test checks the table list against the migrations.                                                                                                                                                                                                                                                                                                                                                                                            | —                                                                               |
| `delete-account`        | Requires `{ "confirm": "DELETE" }`. Removes the user's files in the `progress-photos` bucket, then deletes the auth user; every table cascades from `auth.users`. Deletion is immediate (within §13's 30 days).                                                                                                                                                                                                                                                                                                                                                                                                  | —                                                                               |
| `revenuecat-webhook`    | Sets `profiles.is_premium` from RevenueCat events via `apply_premium_event` (newest event wins). No Supabase JWT (`verify_jwt = false`); checks the shared `Authorization` secret. Setup: `docs/setup/revenuecat.md`.                                                                                                                                                                                                                                                                                                                                                                                            | `REVENUECAT_WEBHOOK_AUTH`                                                       |
| `admob-ssv`             | AdMob rewarded-ad server-side verification: checks Google's ECDSA signature (keys from gstatic, cached), then records `ad_unlocks` (one meal of today's plan, target `YYYY-MM-DD:slot`, today ±1 day; or the initial AI plan) with the service role; XP comes from the existing trigger. No Supabase JWT. Setup: `docs/setup/admob.md`.                                                                                                                                                                                                                                                                          | —                                                                               |
| `push-dispatch`         | Sends unsent `notifications` (last 24 h) as Expo pushes to the user's devices, honouring `notification_preferences` (promotions also need marketing consent); marks them `pushed_at`, deletes unregistered tokens. Run by pg_cron every 5 minutes; `create_weekly_reports()` runs weekly. Setup: `docs/setup/push.md`.                                                                                                                                                                                                                                                                                           | `CRON_SECRET`; optional `EXPO_ACCESS_TOKEN`                                     |
| `generate-meal-plan`    | Daily AI meal plan: Claude picks foods and grams (`_prompts/mealPlan.v1.ts`); each food's numbers come from USDA (generic foods only); `_shared/dietRules.ts` checks names and USDA descriptions against allergies, restrictions (incl. kosher meat+dairy), diet style and avoided foods; any problem → retry with feedback (3 attempts max), else `generation_failed`; portions scaled to each meal's share of the target; stored in `meal_plans` (one per day). Free: one plan a day (today); Premium: up to 3 regenerations and plans up to 7 days ahead (for the grocery list). Cost cap 15 model calls/day. | `ANTHROPIC_API_KEY`, `USDA_API_KEY`; optional `MEAL_PLAN_MODEL`                 |
| `analyze-food-photo`    | Food photo scan: the photo (base64 JPEG/PNG/WebP, type checked from its bytes, ≤5 MB) goes to Claude's vision model with `_prompts/foodPhoto.v1.ts`, which only names the foods and estimates grams; numbers come from USDA generic foods; each item and the plate are checked with `dietRules.ts` and returned with warnings (the user decides what to log). JSON validated with zod, one retry. The photo is never stored. Free: `food_photo_daily_limit_free` scans/day from `app_config` (default 3); Premium: 30/day cost cap. One `ai_usage` row per scan.                                                 | `ANTHROPIC_API_KEY`, `USDA_API_KEY`; optional `VISION_MODEL`                    |
| `generate-insights`     | Premium AI insights: aggregates the last 14 local days (per-day calories, protein, evening share, water, check-in answers, weight change; `generate-insights/aggregate.ts`) and sends only those plus targets and goal types to Claude (`_prompts/insights.v1.ts`). Needs 5+ logged days (else no model call). Output validated with zod; `safety.ts` rejects restrictive advice (skipping meals, fasting, detox, supplements…) → one retry, then unsafe items are dropped. Stored in `ai_insights`, one set per user per day. Cost cap 6 calls/day.                                                             | `ANTHROPIC_API_KEY`; optional `INSIGHTS_MODEL`                                  |
| `generate-grocery-list` | Premium weekly shopping list: reads the stored `meal_plans` for start date … +6 days (already allergy-checked), sums grams per USDA food in code (`list.ts`), then Claude (`_prompts/grocery.v1.ts`) only adds an aisle, a pack to buy and a rough price; unknown ids are ignored and missing ones kept (aisle "other", no price). Stored in `grocery_lists` (one per week start); users may only update `checked`. Regenerating resets the ticks. Cost cap 6 calls/day.                                                                                                                                         | `ANTHROPIC_API_KEY`; optional `GROCERY_MODEL`, `GROCERY_CURRENCY` (default EUR) |
| `analyze-menu`          | Premium restaurant mode: a menu photo (metadata stripped, never stored) or typed dishes go to Claude (`_prompts/menu.v1.ts`), which only lists each dish's typical ingredients and grams; numbers come from USDA generic foods (a dish needs 60% of its grams matched, else no estimate); dish name and ingredients are checked with `dietRules.ts` (warnings, score 0, listed last); others are scored against this meal's budget (`score.ts`: slot share of calories, lowered to what's left today but never below a quarter; slot share of protein). Cost cap 20 calls/day.                                   | `ANTHROPIC_API_KEY`, `USDA_API_KEY`; optional `VISION_MODEL`                    |
| `send-sms`              | Supabase Auth Send SMS hook: verifies the Standard Webhooks signature, then sends the code through the provider in `app_config.sms_provider` (sms.to) with `app_config.sms_sender_id`. No Supabase JWT. Setup: `docs/setup/email-sms.md`.                                                                                                                                                                                                                                                                                                                                                                        | `SEND_SMS_HOOK_SECRET`, `SMSTO_API_KEY`                                         |
| `admin-users`           | Admin dashboard actions that need the service role: GDPR export (same document as `export-data`), account deletion (files, then the auth user; typed ID confirmation), ban and unban. Admins and owners with a two-factor session only; never on yourself; staff accounts only by an owner; every action written to `admin_audit_log` first.                                                                                                                                                                                                                                                                     | —                                                                               |

Set secrets and deploy:

```bash
npx supabase secrets set USDA_API_KEY=<key> ANTHROPIC_API_KEY=<key>
npx supabase functions deploy food-search
npx supabase functions deploy food-barcode
npx supabase functions deploy coach-chat
npx supabase functions deploy export-data
npx supabase functions deploy delete-account
npx supabase functions deploy generate-meal-plan
npx supabase functions deploy analyze-food-photo
npx supabase functions deploy generate-insights
npx supabase functions deploy generate-grocery-list
npx supabase functions deploy analyze-menu
npx supabase functions deploy send-sms --no-verify-jwt
npx supabase functions deploy admin-users
```

Supabase checks the caller's JWT before a function runs (the default `verify_jwt`). Locally, `npx supabase functions serve` runs them with secrets from `supabase/functions/.env` (not committed).

Until `USDA_API_KEY` is set, food search answers `not_configured` and the app points users to manual entry; likewise the coach until `ANTHROPIC_API_KEY` is set. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to functions by Supabase automatically. Local secrets: copy `supabase/functions/.env.example` to `supabase/functions/.env`.

## Access model

| Data                                                                                                              | App (signed-in user)                      | Server (Edge Functions, service role)          |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------- |
| Profile details, goals, preferences, body metrics, food/water logs, check-ins, devices, consents, progress photos | Read and write own rows                   | Full                                           |
| Plans                                                                                                             | Read own; insert new versions (immutable) | Full                                           |
| `is_premium`, `xp`, `streak_days`                                                                                 | Read only                                 | Written by the RevenueCat webhook and triggers |
| Meal plans, coach messages, AI insights, achievements unlocked, ad unlocks                                        | Read only                                 | Written by Edge Functions                      |
| Coach conversations, notifications                                                                                | Read, delete; mark notifications read     | Full                                           |
| Consent history (`consent_events`)                                                                                | Read only (written by trigger)            | Full                                           |
| `app_config`, achievements catalogue                                                                              | Read only                                 | Full                                           |
| `ai_usage`                                                                                                        | No access                                 | Full                                           |

Server-side rules (database triggers):

- A profile is created for every new auth user.
- The 18+ age gate applies to `profiles.birth_date`.
- Weight-loss goals must be below the current weight and at or above BMI 18.5.
- Plans below 1,200 kcal are rejected.
- A check-in awards +20 XP (one per day) and refreshes the streak.
- A check-in's `date` is the device's local date and must be within one day of the server date (covers every time zone), so check-ins can't be back- or future-dated to collect XP.
- Check-in weight feeds the weight trend.
- Achievements: `achievement_progress()` computes each achievement's progress from the user's data; after every food, water, check-in or weight insert, `evaluate_achievements()` unlocks the completed ones once, awards their XP and adds a notification. The app reads its own progress with the `my_achievement_progress()` RPC and cannot unlock anything itself. Rules: 12/14-day streaks; Clean Eater = 5 days within ±10% of the calorie target; Hydration Hero = 7 consecutive days at the water goal; Protein Pro = 10 days at the protein target; Scale Master = 2 kg below the active weight-loss goal's starting weight; First Bite = first food logged; Hydrated = first day at the water goal; Check-In Champ = 7 check-ins; Plan Follower = 10 food items logged from an AI meal plan; 30 Day Streak.
- Streaks and achievement days use the server's UTC date. For users far from UTC, a late-evening log can count toward the next day; moving these rules to the user's time zone is a follow-up.
- Ad unlocks award XP: +15 per meal of the plan (one video per meal, up to 4 a day), +100 for the AI plan.
- Logging awards XP through `grant_xp_once()`: +5 for the first food logged in each meal slot per day (max 4 a day) and +10 the first time the day's water reaches the plan's goal. Each grant is recorded in `xp_events` with a unique `(user_id, reason, ref)`, so deleting and re-logging never pays twice. Levels are derived in the app from `xp` (level n needs 50·n·(n−1) XP in total: 100 for level 2, 300 for 3, 600 for 4 …; `src/lib/gamification/levels.ts`).
- Every consent change is written to `consent_events`.
- Streak milestones (3, 7, 14, 30, 60, 100, 365 days) create a notification; `create_weekly_reports()` creates the weekly report for users who logged food that week. `register_push_token()` moves a device token to the account now signed in on it.

Deleting the auth user cascades to every table. The `delete-account` Edge Function removes the user's Storage files first, then the user.

## Admin access

The admin dashboard (web, `/admin`) reads and writes only through `admin_*` database functions and the `admin-users` Edge Function. Each checks the caller's role in `admin_users` **and** that the session passed two-factor sign-in (`aal2` claim, Supabase MFA with an authenticator app). Roles, lowest to highest:

- **support**: overview, users (read), support replies, safety queue.
- **admin**: plus settings and limits, content (achievements, FAQ), push campaigns (marketing consent only), GDPR export, delete, ban, audit log.
- **owner**: plus managing admin roles and acting on staff accounts.

Settings are an allow-list with validation (`admin_set_config`): free coach and photo-scan limits, AI budget (null = no cap) and model prices, SMS provider and sender, minimum app version, `feature_*` switches. Every change lands in `admin_audit_log`. Coach safety flags are stored as metadata only (`safety_events`: persona, flag, time; never message text).

**First owner** (once, in the SQL editor, after that person has signed up and set up two-factor in the dashboard):

```sql
insert into public.admin_users (user_id, role)
select id, 'owner' from auth.users where email = 'you@example.com';
```

Enable MFA in Supabase: **Authentication → Multi-Factor → TOTP** on.

What the app reads from the dashboard settings: `feature_barcode`, `feature_food_photo`, `feature_restaurant` and `feature_grocery` hide those entry points when set to false (anything missing counts as on); `min_app_version` shows a blocking "Time to update" screen on older native builds (store links from `EXPO_PUBLIC_APP_STORE_URL` / `EXPO_PUBLIC_PLAY_STORE_URL`); the FAQ in Profile → Help comes from `faq_entries` (built-in text until entries exist); support requests from Help land in the Support page, and replies reach the user in the app and by push.
