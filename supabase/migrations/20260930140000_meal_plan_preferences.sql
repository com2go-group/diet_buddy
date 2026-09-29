-- Meal plan preferences (decision log 2026-09-30): how long cooking may take, budget, favourite
-- cuisines, and "cook once, eat twice" (dinner leftovers become the next day's lunch). Plus a
-- daily limit for swapping a single ingredient in a planned meal.
alter table public.preferences
  add column cooking_time text not null default 'any' check (cooking_time in ('quick', 'medium', 'any')),
  add column food_budget text not null default 'any' check (food_budget in ('low', 'medium', 'any')),
  add column cuisines text[] not null default '{}' check (
    cuisines <@ array['mediterranean', 'italian', 'greek', 'spanish', 'french', 'german',
      'middle_eastern', 'indian', 'asian', 'mexican', 'american']::text[]
  ),
  add column leftovers boolean not null default false;

insert into public.app_config (key, value, description) values
  ('meal_swaps_daily_free', '3', 'Free users: ingredient swaps a day in the meal plan (Premium 20)')
on conflict (key) do nothing;

/** Adds the swap limit to admin validation (see 20260930130000). */
create or replace function public.config_key_valid(p_key text, p_value jsonb)
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
  elsif p_key in ('referral_max_per_year', 'referral_redeem_days', 'referral_active_days',
                  'meal_swaps_daily_free') then
    if jsonb_typeof(p_value) <> 'number' or (p_value #>> '{}')::numeric < 0
       or (p_value #>> '{}')::numeric > 365
       or (p_value #>> '{}')::numeric <> floor((p_value #>> '{}')::numeric) then
      raise exception 'a whole number from 0 to 365 is required' using errcode = '22023';
    end if;
    return true;
  end if;
  return false;
end;
$$;
