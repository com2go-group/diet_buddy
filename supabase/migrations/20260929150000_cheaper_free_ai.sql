-- Cheaper free-tier AI (decision log 2026-09-29, follow-up to 20260929140000_ai_budget):
-- * Tomorrow's meal plans for active free users are made overnight with Anthropic's Message
--   Batches API at half price (batch-meal-plans Edge Function, run hourly by pg_cron).
--   ai_usage.batch marks those calls; ai_cost_usd halves them, and they don't count against the
--   daily budget of the day they were made on.
-- * profiles.language: the app's language, so plans made overnight can be translated.
-- * A rewarded "AI boost" video now adds what it earns: 1 coach message (was 3); its budget
--   top-up follows ($0.006, was $0.01).
-- * The ad revenue estimate includes a daily interstitial on the Meals tab.
-- * usda_food_cache: USDA search results for meal-plan ingredients, shared for 30 days, so the
--   nightly batch (and on-demand plans) stay within USDA's hourly request limit.

alter table public.ai_usage add column batch boolean not null default false;

alter table public.profiles add column language text
  check (language is null or language in ('en', 'de', 'fr', 'es', 'it', 'el'));
grant update (language) on public.profiles to authenticated;

create table public.meal_plan_batches (
  id uuid primary key default gen_random_uuid(),
  batch_id text not null unique,
  plan_date date not null,
  request_count integer not null check (request_count >= 0),
  status text not null default 'submitted' check (status in ('submitted', 'processed', 'failed')),
  results jsonb not null default '{}',
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index meal_plan_batches_date on public.meal_plan_batches (plan_date);
alter table public.meal_plan_batches enable row level security;
-- Service role only (no policies, no grants).
revoke all on public.meal_plan_batches from anon, authenticated;
create trigger set_updated_at before update on public.meal_plan_batches
  for each row execute function public.set_updated_at();

-- Generic-food USDA searches (no user data): query → normalised foods. Service role only.
create table public.usda_food_cache (
  query text primary key check (length(query) between 1 and 100),
  foods jsonb not null,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.usda_food_cache enable row level security;
revoke all on public.usda_food_cache from anon, authenticated;
create trigger set_updated_at before update on public.usda_food_cache
  for each row execute function public.set_updated_at();

create or replace function public.ai_cost_usd(
  p_model text, p_input bigint, p_output bigint, p_cache_read bigint, p_cache_write bigint,
  p_prices jsonb, p_batch boolean
)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select public.ai_cost_usd(p_model, p_input, p_output, p_cache_read, p_cache_write, p_prices)
    * case when coalesce(p_batch, false) then 0.5 else 1 end;
$$;

/**
 * For the batch job (service role only): free users who used the app in the last 3 days, have
 * finished onboarding and a plan, and have no meal plan for p_date yet.
 */
create function public.batch_plan_candidates(p_date date, p_limit integer)
returns table (user_id uuid, language text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.user_id, p.language
  from public.profiles p
  where not p.is_premium
    and p.onboarding_completed_at is not null
    and exists (select 1 from public.plans pl where pl.user_id = p.user_id)
    and not exists (
      select 1 from public.meal_plans m where m.user_id = p.user_id and m.date = p_date
    )
    and (
      exists (
        select 1 from public.food_logs f
        where f.user_id = p.user_id and f.logged_at > now() - interval '3 days'
      )
      or exists (
        select 1 from public.meal_plans m
        where m.user_id = p.user_id and m.date between p_date - 3 and p_date - 1
      )
    )
  order by p.user_id
  limit greatest(0, least(p_limit, 100000));
$$;

update public.app_config set value = '1' where key = 'ai_boost_coach_messages' and value = '3';
update public.app_config set value = '0.006' where key = 'ai_budget_per_boost_usd' and value = '0.01';
update public.app_config
  set value = value || '{"interstitial_ecpm_usd": 4, "interstitials_per_active_day": 1}'::jsonb
  where key = 'ad_revenue_assumptions';
insert into public.app_config (key, value, description) values
  ('meal_plan_batch_hour_utc', '17', 'Hour (UTC) after which tomorrow''s free-user meal plans are sent to the batch API'),
  ('meal_plan_batch_max_users', '5000', 'Most free users in one nightly meal-plan batch'),
  ('meal_plan_batch_parallel', '6', 'Plans the batch job checks and stores at the same time')
on conflict (key) do nothing;

create or replace function public.ai_allowance(
  p_user uuid, p_day_start timestamptz, p_local_date text, p_web boolean
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  prices jsonb := coalesce((select value from public.app_config where key = 'ai_prices'), '{}');
  boosts_max integer := public.config_number('ai_boosts_daily_max', 3)::integer;
  boosts integer;
  spent numeric;
  base numeric;
begin
  if p_local_date !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'local date must be YYYY-MM-DD' using errcode = '22023';
  end if;
  -- Plans made overnight by the batch job don't count against the day they were made on.
  select coalesce(sum(public.ai_cost_usd(
    model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, prices, batch
  )), 0) into spent
  from public.ai_usage where user_id = p_user and created_at >= p_day_start and not batch;
  select least(boosts_max, count(*)) into boosts
  from public.ad_unlocks where user_id = p_user and target_id like p_local_date || ':%';
  base := case when p_web
    then public.config_number('ai_free_daily_budget_web_usd', 0.02)
    else public.config_number('ai_free_daily_budget_usd', 0.04) end;
  return jsonb_build_object(
    'premium', coalesce((select is_premium from public.profiles where user_id = p_user), false),
    'spent_usd', round(spent, 6),
    'budget_usd', base + boosts * public.config_number('ai_budget_per_boost_usd', 0.006),
    'boosts', boosts,
    'boosts_max', boosts_max,
    'limits', jsonb_build_object(
      'coach_free', public.config_number('coach_daily_message_limit_free', 3),
      'coach_premium', public.config_number('coach_daily_message_limit_premium', 60),
      'food_photo_free', public.config_number('food_photo_daily_limit_free', 1),
      'alternatives_free', public.config_number('meal_alternatives_daily_free', 1),
      'boost_coach', public.config_number('ai_boost_coach_messages', 1),
      'boost_food_photo', public.config_number('ai_boost_food_photos', 1),
      'boost_alternatives', public.config_number('ai_boost_alternatives', 1)
    )
  );
end;
$$;

create or replace function public.admin_ai_economics(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  prices jsonb := coalesce((select value from public.app_config where key = 'ai_prices'), '{}');
  ads jsonb := coalesce((select value from public.app_config where key = 'ad_revenue_assumptions'), '{}');
  since timestamptz := now() - make_interval(days => greatest(1, least(p_days, 365)));
  free_days bigint;
  free_cost numeric;
  premium_cost numeric;
  premium_users bigint;
  views bigint;
  revenue numeric;
begin
  perform public.require_admin('support');
  -- Active day: a day with a food log or an AI call.
  select count(*) into free_days from (
    select a.user_id, a.day from (
      select user_id, (logged_at at time zone 'utc')::date as day from public.food_logs where logged_at >= since
      union
      select user_id, (created_at at time zone 'utc')::date from public.ai_usage where created_at >= since
    ) a join public.profiles p on p.user_id = a.user_id and not p.is_premium
  ) d;
  select coalesce(sum(case when not coalesce(p.is_premium, false) then c end), 0),
         coalesce(sum(case when p.is_premium then c end), 0)
    into free_cost, premium_cost
  from (
    select u.user_id, public.ai_cost_usd(u.model, u.input_tokens, u.output_tokens,
      u.cache_read_tokens, u.cache_write_tokens, prices, u.batch) as c
    from public.ai_usage u where u.created_at >= since
  ) x left join public.profiles p on p.user_id = x.user_id;
  select count(distinct user_id) into premium_users from public.profiles where is_premium;
  select count(*) into views from public.ad_unlocks where unlocked_at >= since;
  revenue := views * coalesce((ads ->> 'rewarded_ecpm_usd')::numeric, 0) / 1000
    + free_days * coalesce((ads ->> 'banner_impressions_per_active_day')::numeric, 0)
      * coalesce((ads ->> 'banner_ecpm_usd')::numeric, 0) / 1000
    + free_days * coalesce((ads ->> 'interstitials_per_active_day')::numeric, 0)
      * coalesce((ads ->> 'interstitial_ecpm_usd')::numeric, 0) / 1000;
  return jsonb_build_object(
    'days', greatest(1, least(p_days, 365)),
    'free_active_days', free_days,
    'free_ai_cost_usd', round(free_cost, 2),
    'rewarded_views', views,
    'est_ad_revenue_usd', round(revenue, 2),
    'cost_per_free_active_day_usd', case when free_days > 0 then round(free_cost / free_days, 4) end,
    'revenue_per_free_active_day_usd', case when free_days > 0 then round(revenue / free_days, 4) end,
    'premium_ai_cost_usd', round(premium_cost, 2),
    'premium_users', premium_users,
    'assumptions', ads
  );
end;
$$;

create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  prices jsonb := coalesce((select value from public.app_config where key = 'ai_prices'), '{}');
  month_start timestamptz := date_trunc('month', now());
  result jsonb;
begin
  perform public.require_admin('support');
  select jsonb_build_object(
    'users_total', (select count(*) from auth.users),
    'users_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'users_30d', (select count(*) from auth.users where created_at > now() - interval '30 days'),
    'onboarded', (select count(*) from public.profiles where onboarding_completed_at is not null),
    'premium', (select count(*) from public.profiles where is_premium),
    'active_today', (select count(distinct user_id) from public.food_logs where logged_at > now() - interval '1 day'),
    'active_7d', (select count(distinct user_id) from public.food_logs where logged_at > now() - interval '7 days'),
    'open_tickets', (select count(*) from public.support_tickets where status = 'open'),
    'open_safety', (select count(*) from public.safety_events where reviewed_at is null),
    'ai_month', coalesce((
      select jsonb_agg(jsonb_build_object(
        'function', f.function_name, 'model', f.model, 'calls', f.calls,
        'input_tokens', f.input_tokens, 'output_tokens', f.output_tokens,
        'cache_read_tokens', f.cache_read_tokens, 'cache_write_tokens', f.cache_write_tokens,
        'cost_usd', round(public.ai_cost_usd(
          f.model, f.input_tokens, f.output_tokens, f.cache_read_tokens, f.cache_write_tokens,
          prices, f.batch
        ), 2)
      ) order by f.function_name)
      from (
        select function_name, model, batch, count(*) as calls,
               sum(input_tokens) as input_tokens, sum(output_tokens) as output_tokens,
               sum(cache_read_tokens) as cache_read_tokens, sum(cache_write_tokens) as cache_write_tokens
        from public.ai_usage where created_at >= month_start
        group by function_name, model, batch
      ) f
    ), '[]'),
    'ai_budget_usd', (select value from public.app_config where key = 'ai_monthly_budget_usd')
  ) into result;
  return result;
end;
$$;

create or replace function public.admin_set_config(p_key text, p_value jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t text := jsonb_typeof(p_value);
begin
  perform public.require_admin('admin');
  if p_key in (
    'coach_daily_message_limit_free', 'coach_daily_message_limit_premium',
    'food_photo_daily_limit_free', 'meal_alternatives_daily_free', 'ai_boosts_daily_max',
    'ai_boost_coach_messages', 'ai_boost_food_photos', 'ai_boost_alternatives'
  ) then
    if t <> 'number' or (p_value #>> '{}')::numeric < 0 or (p_value #>> '{}')::numeric > 1000
       or (p_value #>> '{}')::numeric <> floor((p_value #>> '{}')::numeric) then
      raise exception 'a whole number from 0 to 1000 is required' using errcode = '22023';
    end if;
  elsif p_key = 'ai_monthly_budget_usd' then
    if not (t = 'null' or (t = 'number' and (p_value #>> '{}')::numeric >= 0)) then
      raise exception 'a positive amount or null (no cap) is required' using errcode = '22023';
    end if;
  elsif p_key in (
    'ai_free_daily_budget_usd', 'ai_free_daily_budget_web_usd', 'ai_budget_per_boost_usd'
  ) then
    if t <> 'number' or (p_value #>> '{}')::numeric < 0 or (p_value #>> '{}')::numeric > 1 then
      raise exception 'an amount from 0 to 1 USD is required' using errcode = '22023';
    end if;
  elsif p_key in ('meal_plan_batch_hour_utc', 'meal_plan_batch_max_users', 'meal_plan_batch_parallel') then
    if t <> 'number' or (p_value #>> '{}')::numeric < 0 or (p_value #>> '{}')::numeric > 100000
       or (p_value #>> '{}')::numeric <> floor((p_value #>> '{}')::numeric) then
      raise exception 'a whole number is required' using errcode = '22023';
    end if;
  elsif p_key = 'ad_revenue_assumptions' then
    if t <> 'object'
       or jsonb_typeof(p_value -> 'rewarded_ecpm_usd') <> 'number'
       or jsonb_typeof(p_value -> 'banner_ecpm_usd') <> 'number'
       or jsonb_typeof(p_value -> 'banner_impressions_per_active_day') <> 'number'
       or jsonb_typeof(coalesce(p_value -> 'interstitial_ecpm_usd', '0')) <> 'number'
       or jsonb_typeof(coalesce(p_value -> 'interstitials_per_active_day', '0')) <> 'number' then
      raise exception 'rewarded_ecpm_usd, banner_ecpm_usd and banner_impressions_per_active_day are required'
        using errcode = '22023';
    end if;
  elsif p_key = 'ai_prices' then
    if t <> 'object' then
      raise exception 'an object of model prices is required' using errcode = '22023';
    end if;
  elsif p_key = 'sms_provider' then
    if t <> 'string' or (p_value #>> '{}') not in ('smsto') then
      raise exception 'unsupported SMS provider' using errcode = '22023';
    end if;
  elsif p_key = 'sms_sender_id' then
    if t <> 'string' or (p_value #>> '{}') !~ '^[A-Za-z0-9 ]{1,11}$' then
      raise exception 'sender ID: up to 11 letters or digits' using errcode = '22023';
    end if;
  elsif p_key = 'min_app_version' then
    if t <> 'string' or (p_value #>> '{}') !~ '^\d+\.\d+\.\d+$' then
      raise exception 'a version like 1.2.0 is required' using errcode = '22023';
    end if;
  elsif p_key ~ '^feature_[a-z_]{2,40}$' then
    if t <> 'boolean' then
      raise exception 'feature switches are true or false' using errcode = '22023';
    end if;
  else
    raise exception 'unknown setting %', p_key using errcode = '22023';
  end if;
  insert into public.app_config (key, value) values (p_key, p_value)
  on conflict (key) do update set value = excluded.value;
  perform public.log_admin_action('set_config', p_key, jsonb_build_object('value', p_value));
end;
$$;

revoke all on function public.ai_cost_usd(text, bigint, bigint, bigint, bigint, jsonb, boolean) from public, anon, authenticated;
revoke all on function public.batch_plan_candidates(date, integer) from public, anon, authenticated;
