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

| Function      | Purpose                                                                                                                   | Secrets                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `food-search` | Searches USDA FoodData Central and returns foods per 100 g with household servings. Only the search text is sent to USDA. | `USDA_API_KEY` (free key from [api.data.gov](https://api.data.gov/signup/)) |

Set secrets and deploy:

```bash
npx supabase secrets set USDA_API_KEY=<key>
npx supabase functions deploy food-search
```

Supabase checks the caller's JWT before a function runs (the default `verify_jwt`). Locally, `npx supabase functions serve` runs them with secrets from `supabase/functions/.env` (not committed).

Until `USDA_API_KEY` is set, food search answers `not_configured` and the app points users to manual entry.

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
- Ad unlocks award XP: +50 for a meal plan, +100 for the AI plan.
- Every consent change is written to `consent_events`.

Deleting the auth user cascades to every table. Deleting the user's files in Storage is the job of the account-deletion Edge Function (Phase 1, item 12).
