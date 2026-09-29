-- Free-tier AI funded by ads (decision log 2026-09-29).
-- * ai_usage records prompt-cache tokens, so costs include cached reads and writes.
-- * ai_cost_usd() prices a usage row from app_config.ai_prices (USD per million tokens).
-- * ai_allowance() is what the AI functions check for free users: today's spend against a daily
--   budget (base + a top-up per rewarded video watched today, capped), plus the feature limits.
--   The feature limits decide what a free user gets; the budget is a backstop against runaway
--   token use (long chats, retries), sized so the promised allowance always fits.
-- * A new rewarded type, 'ai_boost' ("YYYY-MM-DD:n"), buys more coach messages, food photo
--   scans and meal ideas for the day. It gives no XP. Meal reveal videos count as boosts too.
-- * admin_ai_economics() compares free users' AI cost with the estimated ad revenue.

alter table public.ai_usage
  add column cache_read_tokens integer not null default 0 check (cache_read_tokens >= 0),
  add column cache_write_tokens integer not null default 0 check (cache_write_tokens >= 0);

alter type public.unlock_type add value if not exists 'ai_boost';

-- The new enum value can't be used as a literal in the same transaction: compare as text.
alter table public.ad_unlocks
  add constraint ad_unlocks_boost_target check (
    unlock_type::text <> 'ai_boost' or target_id ~ '^\d{4}-\d{2}-\d{2}:([1-9]|10)$'
  ) not valid;

create or replace function public.on_ad_unlocked()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- AI boosts buy AI use, not XP.
  if new.unlock_type::text = 'ai_boost' then
    return new;
  end if;
  perform public.award_xp(new.user_id, case new.unlock_type when 'meal_plan' then 15 else 100 end);
  return new;
end;
$$;

-- ─── settings ────────────────────────────────────────────────────────────────

update public.app_config set value = '3'
  where key = 'coach_daily_message_limit_free';
update public.app_config set value = '1'
  where key = 'food_photo_daily_limit_free';
insert into public.app_config (key, value, description) values
  ('coach_daily_message_limit_free', '3', 'Free coach messages a day before rewarded boosts'),
  ('food_photo_daily_limit_free', '1', 'Free food photo scans a day before rewarded boosts'),
  ('meal_alternatives_daily_free', '1', 'Free "another idea" meal swaps a day before rewarded boosts'),
  ('coach_daily_message_limit_premium', '60', 'Premium fair-use coach messages a day'),
  ('ai_free_daily_budget_usd', '0.04', 'Free users: AI spend a day (USD) before rewarded boosts; a backstop sized to the free allowance (plan + 3 coach messages + 1 scan + 1 idea)'),
  ('ai_free_daily_budget_web_usd', '0.02', 'Free users on the web build (no ads): AI spend a day (USD)'),
  ('ai_budget_per_boost_usd', '0.01', 'Extra daily AI spend (USD) per rewarded video watched (the cost of what a video adds)'),
  ('ai_boosts_daily_max', '3', 'Rewarded videos a day that add AI use'),
  ('ai_boost_coach_messages', '3', 'Coach messages added per rewarded video'),
  ('ai_boost_food_photos', '1', 'Food photo scans added per rewarded video'),
  ('ai_boost_alternatives', '1', 'Meal ideas added per rewarded video'),
  ('ad_revenue_assumptions',
   '{"rewarded_ecpm_usd": 8, "banner_ecpm_usd": 0.5, "banner_impressions_per_active_day": 15}',
   'Estimated ad earnings for the AI economics card (replace with real AdMob figures)')
on conflict (key) do nothing;

-- Prices per million tokens; cache reads 0.1x and 5-minute cache writes 1.25x the input price.
update public.app_config
  set value = value || '{
    "claude-sonnet-5": {"input": 2, "output": 10, "cache_read": 0.2, "cache_write": 2.5},
    "claude-sonnet-5-5": {"input": 2, "output": 10, "cache_read": 0.2, "cache_write": 2.5},
    "claude-haiku-4-5": {"input": 1, "output": 5, "cache_read": 0.1, "cache_write": 1.25}
  }'::jsonb
  where key = 'ai_prices';

create function public.config_number(p_key text, p_default numeric)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select (value #>> '{}')::numeric from public.app_config
      where key = p_key and jsonb_typeof(value) = 'number'),
    p_default
  );
$$;

-- USD for one usage row. The model is matched to the longest price key it starts with
-- ("claude-haiku-4-5-20251001" → "claude-haiku-4-5"); unknown models are priced as Sonnet.
create function public.ai_cost_usd(
  p_model text, p_input bigint, p_output bigint, p_cache_read bigint, p_cache_write bigint,
  p_prices jsonb
)
returns numeric
language sql
immutable
set search_path = ''
as $$
  with price as (
    select value from jsonb_each(coalesce(p_prices, '{}'))
    where p_model = key or p_model like key || '-%'
    order by length(key) desc
    limit 1
  ), p as (
    select
      coalesce((select (value ->> 'input')::numeric from price), 2) as input,
      coalesce((select (value ->> 'output')::numeric from price), 10) as output,
      (select (value ->> 'cache_read')::numeric from price) as cache_read,
      (select (value ->> 'cache_write')::numeric from price) as cache_write
  )
  select (
    coalesce(p_input, 0) * p.input
    + coalesce(p_output, 0) * p.output
    + coalesce(p_cache_read, 0) * coalesce(p.cache_read, p.input * 0.1)
    + coalesce(p_cache_write, 0) * coalesce(p.cache_write, p.input * 1.25)
  ) / 1000000
  from p;
$$;

/**
 * For the AI functions (service role only): the user's AI allowance for their local day.
 * p_day_start is the start of that day as an instant, p_local_date its "YYYY-MM-DD".
 */
create function public.ai_allowance(
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
  select coalesce(sum(public.ai_cost_usd(
    model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, prices
  )), 0) into spent
  from public.ai_usage where user_id = p_user and created_at >= p_day_start;
  select least(boosts_max, count(*)) into boosts
  from public.ad_unlocks where user_id = p_user and target_id like p_local_date || ':%';
  base := case when p_web
    then public.config_number('ai_free_daily_budget_web_usd', 0.02)
    else public.config_number('ai_free_daily_budget_usd', 0.04) end;
  return jsonb_build_object(
    'premium', coalesce((select is_premium from public.profiles where user_id = p_user), false),
    'spent_usd', round(spent, 6),
    'budget_usd', base + boosts * public.config_number('ai_budget_per_boost_usd', 0.01),
    'boosts', boosts,
    'boosts_max', boosts_max,
    'limits', jsonb_build_object(
      'coach_free', public.config_number('coach_daily_message_limit_free', 3),
      'coach_premium', public.config_number('coach_daily_message_limit_premium', 60),
      'food_photo_free', public.config_number('food_photo_daily_limit_free', 1),
      'alternatives_free', public.config_number('meal_alternatives_daily_free', 1),
      'boost_coach', public.config_number('ai_boost_coach_messages', 3),
      'boost_food_photo', public.config_number('ai_boost_food_photos', 1),
      'boost_alternatives', public.config_number('ai_boost_alternatives', 1)
    )
  );
end;
$$;

/**
 * Admin dashboard: free users' AI cost against estimated ad revenue over the last p_days days.
 * Revenue is an estimate from ad_revenue_assumptions (rewarded views are counted; banner
 * impressions are assumed per active day) until real AdMob figures are imported.
 */
create function public.admin_ai_economics(p_days integer default 30)
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
      u.cache_read_tokens, u.cache_write_tokens, prices) as c
    from public.ai_usage u where u.created_at >= since
  ) x left join public.profiles p on p.user_id = x.user_id;
  select count(distinct user_id) into premium_users from public.profiles where is_premium;
  select count(*) into views from public.ad_unlocks where unlocked_at >= since;
  revenue := views * coalesce((ads ->> 'rewarded_ecpm_usd')::numeric, 0) / 1000
    + free_days * coalesce((ads ->> 'banner_impressions_per_active_day')::numeric, 0)
      * coalesce((ads ->> 'banner_ecpm_usd')::numeric, 0) / 1000;
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
          f.model, f.input_tokens, f.output_tokens, f.cache_read_tokens, f.cache_write_tokens, prices
        ), 2)
      ) order by f.function_name)
      from (
        select function_name, model, count(*) as calls,
               sum(input_tokens) as input_tokens, sum(output_tokens) as output_tokens,
               sum(cache_read_tokens) as cache_read_tokens, sum(cache_write_tokens) as cache_write_tokens
        from public.ai_usage where created_at >= month_start
        group by function_name, model
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
  elsif p_key = 'ad_revenue_assumptions' then
    if t <> 'object'
       or jsonb_typeof(p_value -> 'rewarded_ecpm_usd') <> 'number'
       or jsonb_typeof(p_value -> 'banner_ecpm_usd') <> 'number'
       or jsonb_typeof(p_value -> 'banner_impressions_per_active_day') <> 'number' then
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

revoke all on function public.config_number(text, numeric) from public, anon, authenticated;
revoke all on function public.ai_cost_usd(text, bigint, bigint, bigint, bigint, jsonb) from public, anon, authenticated;
revoke all on function public.ai_allowance(uuid, timestamptz, text, boolean) from public, anon, authenticated;
revoke all on function public.admin_ai_economics(integer) from public, anon;
grant execute on function public.admin_ai_economics(integer) to authenticated;
