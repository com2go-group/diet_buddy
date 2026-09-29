# Backend (Supabase)

The schema lives in `supabase/migrations`, reference data in `supabase/seed.sql`, and database tests in `supabase/tests/database` (pgTAP). The app talks to Supabase only through `src/lib/supabase`, using the anon key. Row level security limits every query to the signed-in user's rows.

## Creating the hosted project (one-time, owner)

1. Create an account at [supabase.com](https://supabase.com) (the free plan is enough for development).
2. **New project**, region **Central EU (Frankfurt)** or another EU region (CLAUDE.md §13). Save the database password in a password manager.
3. **Project Settings → API**: copy the Project URL and the anon (public) key into `.env` (see `.env.example`). Never put the service-role key in `.env` or in the app.
4. Link and push the schema from the repo. Don't run `supabase init`: the repo already has
   `supabase/config.toml`. `link` asks for the database password (never put it in a file):
   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```
5. Load the reference data (achievements, config) once: open **SQL Editor** in the dashboard and run the contents of `supabase/seed.sql`. It is safe to re-run.

Auth providers (Apple, Google), email templates and redirect URLs are set up with the Auth task (Phase 1, item 5).

**The DietBuddy project:** ref `maxbfivlqauziwhswxbi`, URL `https://maxbfivlqauziwhswxbi.supabase.co`. The app uses its publishable key (`sb_publishable_…`) as `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Keep the legacy API keys enabled (Project Settings → API keys): the Edge Functions read `SUPABASE_SERVICE_ROLE_KEY`, which Supabase provides from them.

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

| Function                     | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Secrets                                                                                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `food-search`                | Searches USDA FoodData Central and returns foods per 100 g with household servings. Only the search text is sent to USDA; a search typed in another app language is first turned into an English food name by Claude (`_shared/language.ts`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `USDA_API_KEY` (free key from [api.data.gov](https://api.data.gov/signup/)); `ANTHROPIC_API_KEY` for non-English searches (optional `SEARCH_TRANSLATE_MODEL`) |
| `food-barcode`               | Barcode lookup in Open Food Facts (GTIN check digit validated first); per-100 g numbers normalised like USDA (`_shared/openFoodFacts.ts`), products without plausible energy rejected; `food_ref = off:<barcode>`. Runs on the server so the device doesn't contact a third party.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | optional `OFF_USER_AGENT`                                                                                                                                     |
| `coach-chat`                 | AI coach (Aria, Max, Luna). Checks the burst limit (6/min), the daily limit (free: `coach_daily_message_limit_free` + rewarded videos, see _Free-tier AI budget_; Premium: `coach_daily_message_limit_premium`, fair use) and the free AI budget, runs free users on `FREE_AI_MODEL` with prompt caching, builds a de-identified context, calls Claude through the provider adapter (`_shared/llm.ts`), validates the JSON reply (one retry), adds professional-help notes in code when a message shows signs of disordered eating or crisis, stores both messages and logs token usage to `ai_usage`. Prompts: `_prompts/coach.v1.ts`.                                                                                                                                                                                                      | `ANTHROPIC_API_KEY`; optional `COACH_MODEL` (default `claude-sonnet-5`)                                                                                       |
| `export-data`                | GDPR export: the account (email/phone, created date) and every row from every table with a `user_id`, plus the list of Storage files, as one JSON document. A Jest test checks the table list against the migrations.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | —                                                                                                                                                             |
| `delete-account`             | Requires `{ "confirm": "DELETE" }`. Removes the user's files in the `progress-photos` bucket, then deletes the auth user; every table cascades from `auth.users`. Deletion is immediate (within §13's 30 days).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | —                                                                                                                                                             |
| `revenuecat-webhook`         | Sets `profiles.is_premium` from RevenueCat events via `apply_premium_event` (newest event wins). No Supabase JWT (`verify_jwt = false`); checks the shared `Authorization` secret. Setup: `docs/setup/revenuecat.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `REVENUECAT_WEBHOOK_AUTH`                                                                                                                                     |
| `sync-premium`               | Right after a purchase or restore (and at launch if the store says Premium but the server doesn't), checks the caller's `premium` entitlement with RevenueCat's REST API and applies it with `apply_premium_event`, so server-checked features unlock without waiting for the webhook. Unset key → 503 and the app waits for the webhook.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `REVENUECAT_SECRET_KEY`                                                                                                                                       |
| `admob-ssv`                  | AdMob rewarded-ad server-side verification: checks Google's ECDSA signature (keys from gstatic, cached), then records `ad_unlocks` (one meal of today's plan, target `YYYY-MM-DD:slot`, today ±1 day; or the initial AI plan) with the service role; XP comes from the existing trigger. No Supabase JWT. Setup: `docs/setup/admob.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | —                                                                                                                                                             |
| `push-dispatch`              | Sends unsent `notifications` (last 24 h) as Expo pushes to the user's devices, honouring `notification_preferences` (promotions also need marketing consent); marks them `pushed_at`, deletes unregistered tokens. Run by pg_cron every 5 minutes; `create_weekly_reports()` runs weekly. Setup: `docs/setup/push.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `CRON_SECRET`; optional `EXPO_ACCESS_TOKEN`                                                                                                                   |
| `generate-meal-plan`         | Daily AI meal plan: Claude picks foods and grams (`_prompts/mealPlan.v1.ts`); each food's numbers come from USDA (generic foods only); `_shared/dietRules.ts` checks names and USDA descriptions against allergies, restrictions (incl. kosher meat+dairy), diet style and avoided foods; any problem → retry with feedback (3 attempts max), else `generation_failed`; portions scaled to each meal's share of the target; stored in `meal_plans` (one per day). Free: today's (and tomorrow's) plan always, on `FREE_AI_MODEL`, and `meal_alternatives_daily_free` other ideas + rewarded videos within the free AI budget; Premium: up to 3 regenerations and plans up to 7 days ahead (for the grocery list). Cost cap 15 model calls/day.                                                                                               | `ANTHROPIC_API_KEY`, `USDA_API_KEY`; optional `MEAL_PLAN_MODEL`                                                                                               |
| `batch-meal-plans`           | Tomorrow's free-user meal plans through the Anthropic Batch API (half price), checked and stored like `generate-meal-plan`; see _Nightly meal plans (batch)_. Called by pg_cron with `CRON_SECRET`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `ANTHROPIC_API_KEY`, `USDA_API_KEY`, `CRON_SECRET`; optional `FREE_AI_MODEL`                                                                                  |
| `analyze-food-photo`         | Food photo scan: the photo (base64 JPEG/PNG/WebP, type checked from its bytes, ≤5 MB) goes to Claude's vision model with `_prompts/foodPhoto.v1.ts`, which only names the foods and estimates grams; numbers come from USDA generic foods; each item and the plate are checked with `dietRules.ts` and returned with warnings (the user decides what to log). JSON validated with zod, one retry. The photo is never stored. Free: `food_photo_daily_limit_free` scans/day (default 1) + rewarded videos, within the free AI budget, on `FREE_AI_MODEL`; Premium: 30/day cost cap. One `ai_usage` row per scan.                                                                                                                                                                                                                              | `ANTHROPIC_API_KEY`, `USDA_API_KEY`; optional `VISION_MODEL`                                                                                                  |
| `generate-insights`          | Premium AI insights: aggregates the last 14 local days (per-day calories, protein, evening share, water, check-in answers, weight change; `generate-insights/aggregate.ts`) and sends only those plus targets and goal types to Claude (`_prompts/insights.v1.ts`). Needs 5+ logged days (else no model call). Output validated with zod; `safety.ts` rejects restrictive advice (skipping meals, fasting, detox, supplements…) → one retry, then unsafe items are dropped. Stored in `ai_insights`, one set per user per day. Cost cap 6 calls/day.                                                                                                                                                                                                                                                                                         | `ANTHROPIC_API_KEY`; optional `INSIGHTS_MODEL`                                                                                                                |
| `generate-wellness-insights` | Premium Wellness Insights hub. Needs Premium **and** the separate `coach_insights` consent. Screens the user's own coach messages of the last 14 days in code first (`coach-chat/safety.ts`): any sign of disordered eating or crisis returns a professional-help note and no model call. Otherwise, with 5+ messages, sends only those messages (≤ 600 chars each, ≤ 15,000 in total; coach and local date, no replies, profile or name) to Claude (`_prompts/wellness.v1.ts`) for 2–4 themed insights. Rejected in code: restrictive advice (`generate-insights/safety.ts`) and any 6-word run quoted from a message (`privacy.ts`); one retry. The model's own safety flag also returns the support note. Stored in `wellness_insights`, one new set per 7 days. Cost cap 4 calls/day. Withdrawing the consent deletes all sets (trigger) | `ANTHROPIC_API_KEY`; optional `WELLNESS_MODEL`                                                                                                                |
| `generate-grocery-list`      | Premium weekly shopping list: reads the stored `meal_plans` for start date … +6 days (already allergy-checked), sums grams per USDA food in code (`list.ts`), then Claude (`_prompts/grocery.v1.ts`) only adds an aisle, a pack to buy and a rough price; unknown ids are ignored and missing ones kept (aisle "other", no price). Stored in `grocery_lists` (one per week start); users may only update `checked`. Regenerating resets the ticks. Cost cap 6 calls/day.                                                                                                                                                                                                                                                                                                                                                                     | `ANTHROPIC_API_KEY`; optional `GROCERY_MODEL`, `GROCERY_CURRENCY` (default EUR)                                                                               |
| `analyze-menu`               | Premium restaurant mode: a menu photo (metadata stripped, never stored) or typed dishes go to Claude (`_prompts/menu.v1.ts`), which only lists each dish's typical ingredients and grams; numbers come from USDA generic foods (a dish needs 60% of its grams matched, else no estimate); dish name and ingredients are checked with `dietRules.ts` (warnings, score 0, listed last); others are scored against this meal's budget (`score.ts`: slot share of calories, lowered to what's left today but never below a quarter; slot share of protein). Cost cap 20 calls/day.                                                                                                                                                                                                                                                               | `ANTHROPIC_API_KEY`, `USDA_API_KEY`; optional `VISION_MODEL`                                                                                                  |
| `analyze-body-scan`          | Premium AI body scan: front and side photo (metadata stripped, never stored) plus the profile height and sex go to Claude vision (`_prompts/bodyScan.v1.ts`), which returns only waist, hip and neck in cm, whether a face is visible and whether the photos are usable. Needs the separate `body_photos` consent (checked on the server); a visible face or implausible numbers are refused; the app turns the measurements into body fat with the U.S. Navy formula and the user can edit everything. 5 scans/day. A licensed SDK can replace the estimator (`BodyScanEstimator`).                                                                                                                                                                                                                                                         | `ANTHROPIC_API_KEY`; optional `VISION_MODEL`                                                                                                                  |
| `send-sms`                   | Supabase Auth Send SMS hook: verifies the Standard Webhooks signature, then sends the code through the provider in `app_config.sms_provider` (sms.to) with `app_config.sms_sender_id`. No Supabase JWT. Setup: `docs/setup/email-sms.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `SEND_SMS_HOOK_SECRET`, `SMSTO_API_KEY`                                                                                                                       |
| `admin-users`                | Admin dashboard actions that need the service role: GDPR export (same document as `export-data`), account deletion (files, then the auth user; typed ID confirmation), ban and unban, and **Grant Premium** / remove it: a RevenueCat promotional `premium` entitlement (1 week … lifetime, reason required) applied to `is_premium` at once and logged with its outcome. Admins and owners with a two-factor session only; never on yourself; staff accounts only by an owner; every action written to `admin_audit_log`.                                                                                                                                                                                                                                                                                                                   | —                                                                                                                                                             |

Set secrets and deploy:

```bash
npx supabase secrets set --env-file supabase/functions/.env   # or: secrets set USDA_API_KEY=<key> ANTHROPIC_API_KEY=<key>
npx supabase functions deploy                                  # all functions, using config.toml's verify_jwt settings
```

Or one at a time:

```bash
npx supabase functions deploy food-search
npx supabase functions deploy food-barcode
npx supabase functions deploy coach-chat
npx supabase functions deploy export-data
npx supabase functions deploy delete-account
npx supabase functions deploy generate-meal-plan
npx supabase functions deploy analyze-food-photo
npx supabase functions deploy generate-insights
npx supabase functions deploy generate-wellness-insights
npx supabase functions deploy generate-grocery-list
npx supabase functions deploy analyze-menu
npx supabase functions deploy analyze-body-scan
npx supabase functions deploy send-sms --no-verify-jwt
npx supabase functions deploy admin-users
```

Supabase checks the caller's JWT before a function runs (the default `verify_jwt`). Locally, `npx supabase functions serve` runs them with secrets from `supabase/functions/.env` (not committed).

Until `USDA_API_KEY` is set, food search answers `not_configured` and the app points users to manual entry; likewise the coach until `ANTHROPIC_API_KEY` is set. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to functions by Supabase automatically. Local secrets: copy `supabase/functions/.env.example` to `supabase/functions/.env`.

## Free-tier AI budget

Free users' AI is paid for by ads (decision log 2026-09-29; the numbers are in `docs/business/ai-ad-economics.xlsx`):

- **Cheaper model.** `coach-chat`, `generate-meal-plan` and `analyze-food-photo` run free users on `FREE_AI_MODEL` (default `claude-haiku-4-5`); Premium keeps each feature's own model. The coach uses prompt caching (cached once a conversation passes the model's minimum of 4,096 tokens on Haiku 4.5, 1,024 on Sonnet 5). `ai_usage` records cache tokens.
- **Daily budget (backstop).** The feature limits decide what free users get; the budget only stops runaway token use (long chats, retries) and is sized so the promised allowance fits. Each call first asks `ai_allowance(user, day start, local date, web)`: today's spend (from `ai_usage` × `ai_prices`, via `ai_cost_usd`) against `ai_free_daily_budget_usd` (web: `ai_free_daily_budget_web_usd`, the web build has no ads) plus `ai_budget_per_boost_usd` per rewarded video watched today, counting at most `ai_boosts_daily_max`. Today's meal plan is always generated (it's the core feature); its cost still counts.
- **Feature limits.** Free: coach `coach_daily_message_limit_free`, photo scans `food_photo_daily_limit_free`, meal ideas `meal_alternatives_daily_free`, each raised by `ai_boost_*` per video. Premium: coach `coach_daily_message_limit_premium` (fair use), photo scans 30, meal ideas 10.
- **Rewarded "AI boost".** When a free user hits a limit or the budget, the function answers 429 with `boost: {target: "YYYY-MM-DD:n", adds}` (null on the web or once the daily maximum is reached). The app offers an opt-in video; `admob-ssv` records `ad_unlocks` type `ai_boost` from Google's callback (no XP), and the next request counts it. Meal reveal videos count as boosts too.
- **Local day.** The app sends `x-client-tz-offset` (`Date.getTimezoneOffset()`) and `x-client-platform` with these calls (`src/lib/ai/headers.ts`). Both are hints: a wrong offset only moves the day boundary; claiming not to be on the web only gives the native base budget.
- **Dashboard.** Overview → _Free-tier AI vs ads_ (`admin_ai_economics`) compares AI cost per active free user-day with estimated ad revenue from `ad_revenue_assumptions` (rewarded, banner and interstitial earnings per 1,000, banner impressions and interstitials per day; overnight batch calls are counted at half price). All values are editable in Settings; replace the assumptions with real AdMob figures after launch.
- **Video rewards match their earnings.** One rewarded video adds 1 coach message (`ai_boost_coach_messages`), 1 photo scan or 1 meal idea, and `ai_budget_per_boost_usd` (0.006) of budget: about what the video earns after the non-personalised discount.
- **Daily interstitial.** Free users on a phone see one full-screen ad when they first open Meals each day (not on the day onboarding finished; remembered on the device in `journeyStore.mealsAdShownOn`). It helps pay for the day's meal plan.

## Nightly meal plans (batch)

`batch-meal-plans` makes tomorrow's meal plans for active free users through Anthropic's Message Batches API (half price; results within 24 hours, usually minutes). Each run (pg_cron, every 2 minutes, `CRON_SECRET` bearer):

1. **Collects** finished batches (`meal_plan_batches`, service role only): each reply goes through the same code as `generate-meal-plan` (`planFromReply`: USDA numbers, allergy/restriction/diet/avoid checks, portions; then translation into `profiles.language` and `assemblePlan`). A reply that fails a check is dropped, never stored, and the app makes that plan on demand as before (with retries). Users who have a plan by then, or went Premium, are skipped. Work is done in chunks of `meal_plan_batch_parallel` for up to ~100 s per run, with the position saved in `meal_plan_batches.results`; a batch not processed after 30 hours is marked failed.
2. **Submits** once a day after `meal_plan_batch_hour_utc` (default 17): tomorrow's (UTC) requests for up to `meal_plan_batch_max_users` free users from `batch_plan_candidates` (onboarded, with a plan, no meal plan for that day, and food logged or a meal plan in the last 3 days). Free plans use the concise prompt (shorter descriptions, fewer ingredients and steps) and `FREE_AI_MODEL`.

Batch calls are logged in `ai_usage` with `batch = true` (half price in `ai_cost_usd`) under `batch-meal-plans`; they don't count toward the user's free AI budget for the day. USDA searches from both meal-plan functions go through `usda_food_cache` (generic search text → foods, 30 days; no user data), which keeps the batch within USDA's hourly request limit.

Set up once in the SQL editor (same secret as `push-dispatch`, `docs/setup/push.md`):

```sql
select cron.schedule('batch-meal-plans', '*/2 * * * *', $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/batch-meal-plans',
    headers := '{"Authorization": "Bearer <secret>", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
$$);
```

Without `ANTHROPIC_API_KEY` and `USDA_API_KEY` the function answers `configured: false` and does nothing.

## Abuse limits and data retention

- **Counters.** `rate_limit_hit(key, window seconds, max)` counts fixed-window hits in `rate_limits` (service role only; refused attempts count too). Used by `send-sms` (see `docs/auth.md` → Bot protection) and per user by `food-search` (30/min, 600/day) and `food-barcode` (20/min, 300/day) from `app_config.rate_limits`; over a cap they answer 429 `rate_limited`. If the counters are unreachable, food lookups are let through (fail open) but SMS is not (fail closed).
- **Retention.** `purge_old_data()` deletes coach messages (24 months), notifications (6), AI usage (25), safety flags (12), AI and wellness insights (12), meal plans and grocery lists (12), push tokens not refreshed for 12 months, plus counters (8 days), the USDA cache (60 days) and batch records (90 days). Periods are in `app_config.data_retention` (Admin → Settings). The health log (food, water, check-ins, body metrics, plans, goals, photos) stays until the user deletes it or the account. Schedule it once in the SQL editor:

```sql
select cron.schedule('purge-old-data', '17 3 * * *', $$ select public.purge_old_data(); $$);
```

## Referrals

Every user has an 8-character invite code (`my_referral_code()`, created on first use). A new user can enter a friend's code within `referral_redeem_days` (14) of signing up (`redeem_referral`: one code per person, never your own, at most `referral_max_per_year` (10) invites per referrer). `referral-rewards` (pg_cron every 30 min, `CRON_SECRET`) rewards invites whose new user finished onboarding and logged food on `referral_active_days` (3) different days: both get a **monthly promotional `premium` entitlement** in RevenueCat (`_shared/revenuecat.ts`, needs `REVENUECAT_SECRET_KEY`), applied to `is_premium` at once, and an in-app notification (`type = 'referral'`, pushed like badges). An invite is claimed (`rewarding`) before granting, so parallel runs never reward twice; a failed grant returns it to `pending`. Invites still pending after 60 days expire. Schedule once:

```sql
select cron.schedule('referral-rewards', '*/30 * * * *', $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/referral-rewards',
    headers := '{"Authorization": "Bearer <secret>", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
$$);
```

## European food data (CIQUAL)

`food-search` lists up to 5 foods from `eu_foods` before USDA's (`search_eu_foods`: every word of the query must match; French users search the French names with what they typed, everyone else the English names with the English query). Logged as `food_ref = ciqual:<code>`, with the ANSES attribution under the numbers. If USDA is down, the European results are still returned. Load or refresh the table (ANSES publishes it under Licence Ouverte / Etalab 2.0):

1. Download the English "Table Ciqual" spreadsheet from https://ciqual.anses.fr (Downloads) and save it as **CSV UTF-8** in Excel or LibreOffice.
2. `npm run foods:ciqual -- <file.csv> --sql ciqual.sql`, then run `ciqual.sql` in the Supabase SQL editor (or with psql), **or** `SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run foods:ciqual -- <file.csv> --upload`.

About 3,000 foods; rows without an English name or energy value are skipped. Other national tables (NEVO, CoFID) can be added under their own `source` with a similar importer.

## Access model

| Data                                                                                                              | App (signed-in user)                      | Server (Edge Functions, service role)          |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------- |
| Profile details, goals, preferences, body metrics, food/water logs, check-ins, devices, consents, progress photos | Read and write own rows                   | Full                                           |
| Plans                                                                                                             | Read own; insert new versions (immutable) | Full                                           |
| `is_premium`, `xp`, `streak_days`, `streak_freezes`                                                               | Read only                                 | Written by the RevenueCat webhook and triggers |
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
- Streak freezes: `refresh_streak` gives one freeze (max 2, `profiles.streak_freezes`) each time the streak reaches a new multiple of 7, and uses one to cover a single missed day in the last two days when the run continues before it (row in `streak_freezes`, notification). Users can only read both.
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
