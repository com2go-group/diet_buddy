-- DietBuddy foundation: extensions, enum types and shared helpers.
-- Enum values mirror src/lib/nutrition/types.ts and the prototype's option lists.

create extension if not exists pgcrypto with schema extensions;

create type public.gender as enum ('male', 'female', 'unspecified');
create type public.unit_system as enum ('metric', 'imperial');
create type public.goal_type as enum (
  'lose_fat', 'build_muscle', 'body_recomposition', 'improve_performance', 'healthy_lifestyle'
);
create type public.pace as enum ('sustainable', 'balanced', 'fast');
create type public.activity_level as enum ('sedentary', 'lightly_active', 'active', 'very_active');
create type public.training_frequency as enum ('0_1', '2_3', '4_5', '6_plus');
create type public.metric_source as enum ('manual', 'scan', 'healthkit', 'health_connect');
create type public.meal_slot as enum ('breakfast', 'lunch', 'snack', 'dinner');
create type public.food_source as enum ('search', 'manual', 'photo', 'plan');
create type public.mood as enum ('great', 'good', 'okay', 'low', 'tough');
create type public.hunger_level as enum ('very_low', 'low', 'normal', 'high', 'very_high');
create type public.coach_persona as enum ('aria', 'max', 'luna');
create type public.message_role as enum ('user', 'assistant');
create type public.unlock_type as enum ('meal_plan', 'ai_plan');
create type public.consent_type as enum ('health_data', 'ads_personalization', 'analytics', 'marketing');
create type public.health_platform as enum ('healthkit', 'health_connect');

-- Keeps updated_at current on every table.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Weight-loss goals below BMI 18.5 are blocked (CLAUDE.md §9). Mirrors src/lib/nutrition/bmi.ts.
create function public.bmi(weight_kg numeric, height_cm numeric)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case when height_cm > 0 then weight_kg / ((height_cm / 100) ^ 2) end;
$$;
