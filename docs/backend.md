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

| Function         | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Secrets                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `food-search`    | Searches USDA FoodData Central and returns foods per 100 g with household servings. Only the search text is sent to USDA.                                                                                                                                                                                                                                                                                                                                        | `USDA_API_KEY` (free key from [api.data.gov](https://api.data.gov/signup/)) |
| `coach-chat`     | AI coach (Aria, Max, Luna). Checks the burst limit (6/min) and the free daily limit (`app_config.coach_daily_message_limit_free`), builds a de-identified context, calls Claude through the provider adapter (`_shared/llm.ts`), validates the JSON reply (one retry), adds professional-help notes in code when a message shows signs of disordered eating or crisis, stores both messages and logs token usage to `ai_usage`. Prompts: `_prompts/coach.v1.ts`. | `ANTHROPIC_API_KEY`; optional `COACH_MODEL` (default `claude-sonnet-5`)     |
| `export-data`    | GDPR export: the account (email/phone, created date) and every row from every table with a `user_id`, plus the list of Storage files, as one JSON document. A Jest test checks the table list against the migrations.                                                                                                                                                                                                                                            | —                                                                           |
| `delete-account` | Requires `{ "confirm": "DELETE" }`. Removes the user's files in the `progress-photos` bucket, then deletes the auth user; every table cascades from `auth.users`. Deletion is immediate (within §13's 30 days).                                                                                                                                                                                                                                                  | —                                                                           |

Set secrets and deploy:

```bash
npx supabase secrets set USDA_API_KEY=<key> ANTHROPIC_API_KEY=<key>
npx supabase functions deploy food-search
npx supabase functions deploy coach-chat
npx supabase functions deploy export-data
npx supabase functions deploy delete-account
```

Supabase checks the caller's JWT before a function runs (the default `verify_jwt`). Locally, `npx supabase functions serve` runs them with secrets from `supabase/functions/.env` (not committed).

Until `USDA_API_KEY` is set, food search answers `not_configured` and the app points users to manual entry; likewise the coach until `ANTHROPIC_API_KEY` is set. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to functions by Supabase automatically. Local secrets: copy `supabase/functions/.env.example` to `supabase/functions/.env`.

## Access model

| Data                                                                                                              | App (signed-in user)                      | Server (Edge Functions, service role)          |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------- |
| Profile details, goals, preferences, body metrics, food/water logs, check-ins, devices, consents, progress photos | Read and write own rows                   | Full                                           |
| Plans                                                                                                             | Read own; insert new versions (immutable) | Full                                           |
| `is_premium`, `xp`, `streak_days`                                                                                 | Read only                                 | Written by the RevenueCat webhook and triggers |
| Meal plans, coach messages, achievements unlocked, ad unlocks                                                     | Read only                                 | Written by Edge Functions                      |
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
- Achievements: `achievement_progress()` computes each achievement's progress from the user's data; after every food, water, check-in or weight insert, `evaluate_achievements()` unlocks the completed ones once, awards their XP and adds a notification. The app reads its own progress with the `my_achievement_progress()` RPC and cannot unlock anything itself. Rules: 12/14-day streaks; Clean Eater = 5 days within ±10% of the calorie target; Hydration Hero = 7 consecutive days at the water goal; Protein Pro = 10 days at the protein target; Scale Master = 2 kg below the active weight-loss goal's starting weight.
- Streaks and achievement days use the server's UTC date. For users far from UTC, a late-evening log can count toward the next day; moving these rules to the user's time zone is a follow-up.
- Ad unlocks award XP: +50 for a meal plan, +100 for the AI plan.
- Every consent change is written to `consent_events`.

Deleting the auth user cascades to every table. The `delete-account` Edge Function removes the user's Storage files first, then the user.
