-- Abuse limits and data retention (decision log 2026-09-30):
-- * rate_limits + rate_limit_hit(): fixed-window counters for the SMS guard (send-sms) and the
--   food search / barcode functions. Service role only.
-- * purge_old_data(): deletes data past its retention period (app_config.data_retention); run
--   nightly by pg_cron (docs/backend.md → Data retention).
-- * The free AI budget goes from $0.04 to $0.03 a day.
-- * admin_set_config validates new keys through config_key_valid(), which later migrations
--   replace instead of the whole function.

create table public.rate_limits (
  key text not null check (length(key) between 1 and 200),
  window_seconds integer not null check (window_seconds between 1 and 604800),
  window_start timestamptz not null,
  hits integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (key, window_seconds, window_start)
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;
create trigger set_updated_at before update on public.rate_limits
  for each row execute function public.set_updated_at();

/**
 * Counts one hit for `p_key` in the current fixed window and says whether it is within `p_max`.
 * Rejected attempts count too, so hammering doesn't get cheaper. Service role only.
 */
create function public.rate_limit_hit(p_key text, p_window_seconds integer, p_max integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  w timestamptz := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );
  n integer;
begin
  insert into public.rate_limits as r (key, window_seconds, window_start, hits)
  values (p_key, p_window_seconds, w, 1)
  on conflict (key, window_seconds, window_start) do update set hits = r.hits + 1
  returning hits into n;
  return n <= p_max;
end;
$$;
revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;

insert into public.app_config (key, value, description) values
  ('sms_guard',
   '{"allowed_prefixes": ["30","31","32","33","34","351","352","353","354","356","357","358","359","36","370","371","372","385","386","39","40","41","420","421","423","43","44","45","46","47","48","49"],
     "per_number_hour": 3, "per_number_day": 6, "global_hour": 300, "global_day": 2000}',
   'Sign-up texts: calling codes allowed (EU/EEA, UK, Switzerland) and caps per number and overall'),
  ('rate_limits',
   '{"food_search_per_minute": 30, "food_search_per_day": 600, "food_barcode_per_minute": 20, "food_barcode_per_day": 300}',
   'Per-user caps on food search and barcode lookups (USDA and Open Food Facts quotas)'),
  ('data_retention',
   '{"coach_messages_months": 24, "notifications_months": 6, "ai_usage_months": 25, "safety_events_months": 12, "insights_months": 12, "meal_plans_months": 12, "push_tokens_months": 12}',
   'Months after which old data is deleted by purge_old_data() (nightly)')
on conflict (key) do nothing;

update public.app_config set value = '0.03'
where key = 'ai_free_daily_budget_usd' and value = '0.04';
update public.app_config
set description = 'Free users: AI spend a day (USD) before rewarded boosts; a backstop (overnight batch plans don''t count)'
where key = 'ai_free_daily_budget_usd';

/** A whole number of months from data_retention, never below 1. */
create function public.retention_months(p_key text, p_default integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(1, coalesce(
    (select (value ->> p_key)::integer from public.app_config where key = 'data_retention'),
    p_default
  ));
$$;
revoke all on function public.retention_months(text, integer) from public, anon, authenticated;

/**
 * Deletes data past its retention period and returns how many rows went per table. The core
 * health log (food, water, check-ins, body metrics, plans, goals, photos) is kept while the
 * account exists: it is what the user signed up for and is deleted with the account.
 */
create function public.purge_old_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  out jsonb := '{}';
  n integer;
begin
  delete from public.coach_messages
  where created_at < now() - make_interval(months => public.retention_months('coach_messages_months', 24));
  get diagnostics n = row_count; out := out || jsonb_build_object('coach_messages', n);
  -- Conversations left empty.
  delete from public.coach_conversations c
  where c.created_at < now() - make_interval(months => public.retention_months('coach_messages_months', 24))
    and not exists (select 1 from public.coach_messages m where m.conversation_id = c.id);
  get diagnostics n = row_count; out := out || jsonb_build_object('coach_conversations', n);

  delete from public.notifications
  where created_at < now() - make_interval(months => public.retention_months('notifications_months', 6));
  get diagnostics n = row_count; out := out || jsonb_build_object('notifications', n);

  delete from public.ai_usage
  where created_at < now() - make_interval(months => public.retention_months('ai_usage_months', 25));
  get diagnostics n = row_count; out := out || jsonb_build_object('ai_usage', n);

  delete from public.safety_events
  where created_at < now() - make_interval(months => public.retention_months('safety_events_months', 12));
  get diagnostics n = row_count; out := out || jsonb_build_object('safety_events', n);

  delete from public.ai_insights
  where created_at < now() - make_interval(months => public.retention_months('insights_months', 12));
  get diagnostics n = row_count; out := out || jsonb_build_object('ai_insights', n);
  delete from public.wellness_insights
  where created_at < now() - make_interval(months => public.retention_months('insights_months', 12));
  get diagnostics n = row_count; out := out || jsonb_build_object('wellness_insights', n);

  delete from public.meal_plans
  where date < (now() - make_interval(months => public.retention_months('meal_plans_months', 12)))::date;
  get diagnostics n = row_count; out := out || jsonb_build_object('meal_plans', n);
  delete from public.grocery_lists
  where created_at < now() - make_interval(months => public.retention_months('meal_plans_months', 12));
  get diagnostics n = row_count; out := out || jsonb_build_object('grocery_lists', n);

  -- A token not refreshed for this long belongs to a device that no longer uses the app.
  delete from public.push_tokens
  where updated_at < now() - make_interval(months => public.retention_months('push_tokens_months', 12));
  get diagnostics n = row_count; out := out || jsonb_build_object('push_tokens', n);

  -- Housekeeping (no or short-lived personal data).
  delete from public.rate_limits where window_start < now() - interval '8 days';
  get diagnostics n = row_count; out := out || jsonb_build_object('rate_limits', n);
  delete from public.usda_food_cache where fetched_at < now() - interval '60 days';
  get diagnostics n = row_count; out := out || jsonb_build_object('usda_food_cache', n);
  delete from public.meal_plan_batches where created_at < now() - interval '90 days';
  get diagnostics n = row_count; out := out || jsonb_build_object('meal_plan_batches', n);
  return out;
end;
$$;
revoke all on function public.purge_old_data() from public, anon, authenticated;

/**
 * Validation for settings added after 2026-09-29 (admin_set_config calls it for keys it doesn't
 * know). Raises a readable error for a bad value; returns false for an unknown key.
 */
create function public.config_key_valid(p_key text, p_value jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  k text;
begin
  if p_key = 'sms_guard' then
    if jsonb_typeof(p_value) <> 'object'
       or jsonb_typeof(p_value -> 'allowed_prefixes') <> 'array'
       or exists (
         select 1 from jsonb_array_elements(p_value -> 'allowed_prefixes') e
         where jsonb_typeof(e) <> 'string' or (e #>> '{}') !~ '^[1-9][0-9]{0,3}$'
       ) then
      raise exception 'allowed_prefixes: a list of calling codes like "49"' using errcode = '22023';
    end if;
    foreach k in array array['per_number_hour', 'per_number_day', 'global_hour', 'global_day'] loop
      if jsonb_typeof(p_value -> k) <> 'number' or (p_value ->> k)::numeric < 0
         or (p_value ->> k)::numeric <> floor((p_value ->> k)::numeric) then
        raise exception '% must be a whole number', k using errcode = '22023';
      end if;
    end loop;
    return true;
  elsif p_key in ('rate_limits', 'data_retention') then
    if jsonb_typeof(p_value) <> 'object' then
      raise exception 'an object of whole numbers is required' using errcode = '22023';
    end if;
    for k in select jsonb_object_keys(p_value) loop
      if jsonb_typeof(p_value -> k) <> 'number' or (p_value ->> k)::numeric < 1
         or (p_value ->> k)::numeric > 100000
         or (p_value ->> k)::numeric <> floor((p_value ->> k)::numeric) then
        raise exception '% must be a whole number of at least 1', k using errcode = '22023';
      end if;
    end loop;
    return true;
  end if;
  return false;
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
  elsif not public.config_key_valid(p_key, p_value) then
    raise exception 'unknown setting %', p_key using errcode = '22023';
  end if;
  insert into public.app_config (key, value) values (p_key, p_value)
  on conflict (key) do update set value = excluded.value;
  perform public.log_admin_action('set_config', p_key, jsonb_build_object('value', p_value));
end;
$$;
