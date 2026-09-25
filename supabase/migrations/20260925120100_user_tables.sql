-- User-owned tables (CLAUDE.md §10) with row level security.
--
-- Access model:
--   * Every row belongs to auth.users via user_id (on delete cascade, so deleting the auth user
--     hard-deletes all their data).
--   * RLS limits authenticated users to their own rows; anon gets nothing.
--   * Server-owned data (premium flag, XP, streaks, unlocks, achievements, coach messages,
--     meal plans, AI usage) is read-only to users and written by Edge Functions with the
--     service role, or by the security-definer triggers in the next migration.

-- ─── profiles ────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  name text check (char_length(name) <= 80),
  birth_date date check (birth_date >= date '1900-01-01'),
  gender public.gender,
  height_cm numeric(5, 1) check (height_cm between 100 and 250),
  units public.unit_system not null default 'metric',
  is_premium boolean not null default false,
  xp integer not null default 0 check (xp >= 0),
  streak_days integer not null default 0 check (streak_days >= 0),
  -- Last onboarding step reached, so onboarding can resume (CLAUDE.md §7.2).
  onboarding_step text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── goals ───────────────────────────────────────────────────────────────────
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_types public.goal_type[] not null default '{}',
  start_weight_kg numeric(5, 2) check (start_weight_kg between 30 and 350),
  goal_weight_kg numeric(5, 2) check (goal_weight_kg between 30 and 350),
  pace public.pace,
  goal_date date,
  motivations text[] not null default '{}',
  motivation_other text check (char_length(motivation_other) <= 200),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index goals_one_active_per_user on public.goals (user_id) where active;

-- ─── preferences ─────────────────────────────────────────────────────────────
create table public.preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  activity_level public.activity_level,
  training_frequency public.training_frequency,
  diet_styles text[] not null default '{}',
  restrictions text[] not null default '{}',
  restriction_other text check (char_length(restriction_other) <= 200),
  avoid_foods text[] not null default '{}',
  allergies text[] not null default '{}',
  allergy_other text check (char_length(allergy_other) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── body_metrics ────────────────────────────────────────────────────────────
create table public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  measured_at timestamptz not null default now(),
  source public.metric_source not null default 'manual',
  weight_kg numeric(5, 2) check (weight_kg between 30 and 350),
  body_fat_pct numeric(4, 1) check (body_fat_pct between 1 and 80),
  lean_mass_kg numeric(5, 2) check (lean_mass_kg > 0),
  fat_mass_kg numeric(5, 2) check (fat_mass_kg >= 0),
  waist_cm numeric(5, 1) check (waist_cm between 30 and 250),
  bmr integer check (bmr between 500 and 5000),
  tdee integer check (tdee between 500 and 8000),
  bmi numeric(4, 1) check (bmi between 8 and 100),
  user_overridden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index body_metrics_user_measured on public.body_metrics (user_id, measured_at desc);

-- ─── plans ───────────────────────────────────────────────────────────────────
-- Versioned daily targets. The calorie check is a last line of defence for the 1,200 kcal floor.
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  version integer not null check (version > 0),
  daily_calories integer not null check (daily_calories between 1200 and 6000),
  protein_g integer not null check (protein_g >= 0),
  carbs_g integer not null check (carbs_g >= 0),
  fat_g integer not null check (fat_g >= 0),
  fiber_g integer not null check (fiber_g >= 0),
  water_ml integer not null check (water_ml between 500 and 6000),
  exercise_recommendation jsonb,
  forecast jsonb,
  generated_by text not null default 'app',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, version)
);

-- ─── meal_plans (written by generate-meal-plan) ──────────────────────────────
create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  meals jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

-- ─── food_logs ───────────────────────────────────────────────────────────────
create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  logged_at timestamptz not null default now(),
  meal_slot public.meal_slot not null,
  food_ref text,
  name text not null check (char_length(name) between 1 and 200),
  quantity numeric(8, 2) check (quantity > 0),
  unit text check (char_length(unit) <= 32),
  calories numeric(7, 1) not null check (calories >= 0),
  protein_g numeric(6, 1) not null default 0 check (protein_g >= 0),
  carbs_g numeric(6, 1) not null default 0 check (carbs_g >= 0),
  fat_g numeric(6, 1) not null default 0 check (fat_g >= 0),
  source public.food_source not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index food_logs_user_logged on public.food_logs (user_id, logged_at desc);

-- ─── water_logs ──────────────────────────────────────────────────────────────
create table public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  logged_at timestamptz not null default now(),
  ml integer not null check (ml between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index water_logs_user_logged on public.water_logs (user_id, logged_at desc);

-- ─── checkins ────────────────────────────────────────────────────────────────
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null default current_date,
  mood public.mood not null,
  energy smallint not null check (energy between 1 and 10),
  sleep_hours numeric(3, 1) check (sleep_hours between 0 and 24),
  hunger public.hunger_level,
  weight_kg numeric(5, 2) check (weight_kg between 30 and 350),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

-- ─── progress_photos (files in the private progress-photos bucket) ──────────
create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  taken_at timestamptz not null default now(),
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Files live under <user_id>/..., matching the storage policies.
  check (split_part(storage_path, '/', 1) = user_id::text)
);

-- ─── coach (messages written by coach-chat, which enforces the free-tier limit) ─
create table public.coach_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  persona public.coach_persona not null,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index coach_conversations_user on public.coach_conversations (user_id, updated_at desc);

create table public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.coach_conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  persona public.coach_persona not null,
  role public.message_role not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index coach_messages_conversation on public.coach_messages (conversation_id, created_at);
create index coach_messages_user_created on public.coach_messages (user_id, created_at desc);

-- ─── achievements ────────────────────────────────────────────────────────────
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text not null,
  emoji text,
  xp_reward integer not null default 0 check (xp_reward >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

-- ─── ad_unlocks (recorded server-side on the AdMob reward callback) ─────────
create table public.ad_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  unlock_type public.unlock_type not null,
  target_id text not null,
  unlocked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, unlock_type, target_id)
);

-- ─── notifications ───────────────────────────────────────────────────────────
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notifications_user_created on public.notifications (user_id, created_at desc);

-- ─── device_connections ──────────────────────────────────────────────────────
create table public.device_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  platform public.health_platform not null,
  connected_at timestamptz not null default now(),
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, platform)
);

-- ─── consents (current state) + consent_events (append-only audit trail) ────
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  consent_type public.consent_type not null,
  granted boolean not null,
  version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, consent_type)
);

create table public.consent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  consent_type public.consent_type not null,
  granted boolean not null,
  version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index consent_events_user on public.consent_events (user_id, created_at desc);

-- ─── server-only tables ──────────────────────────────────────────────────────
-- Tunable limits, e.g. coach_daily_message_limit_free (decision log 2026-09-25).
create table public.app_config (
  key text primary key,
  value jsonb not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Token usage per user and function, for AI cost monitoring (CLAUDE.md §11).
create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  function_name text not null,
  model text not null,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ai_usage_user_created on public.ai_usage (user_id, created_at desc);

-- ─── updated_at triggers ─────────────────────────────────────────────────────
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'goals', 'preferences', 'body_metrics', 'plans', 'meal_plans', 'food_logs',
    'water_logs', 'checkins', 'progress_photos', 'coach_conversations', 'coach_messages',
    'achievements', 'user_achievements', 'ad_unlocks', 'notifications', 'device_connections',
    'consents', 'consent_events', 'app_config', 'ai_usage'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;
