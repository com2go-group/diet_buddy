-- Referrals (decision log 2026-09-30): every user has an invite code; a new user can enter a
-- friend's code within 14 days of signing up. Once the new user has finished onboarding and
-- logged food on 3 different days, both get a month of Premium (RevenueCat promotional
-- entitlement, granted by the referral-rewards Edge Function). At most `referral_max_per_year`
-- rewarded invites per person. Users can read their own rows; everything else goes through
-- functions.

create table public.referral_codes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.referral_codes enable row level security;
revoke all on public.referral_codes from anon, authenticated;
grant select on public.referral_codes to authenticated;
create policy "own code" on public.referral_codes for select to authenticated
  using (user_id = (select auth.uid()));
create trigger set_updated_at before update on public.referral_codes
  for each row execute function public.set_updated_at();

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users (id) on delete cascade,
  referred_id uuid not null unique references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'rewarding', 'rewarded', 'expired')),
  rewarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (referrer_id <> referred_id)
);
create index referrals_referrer on public.referrals (referrer_id, created_at);
alter table public.referrals enable row level security;
revoke all on public.referrals from anon, authenticated;
grant select on public.referrals to authenticated;
create policy "own referrals" on public.referrals for select to authenticated
  using (referrer_id = (select auth.uid()) or referred_id = (select auth.uid()));
create trigger set_updated_at before update on public.referrals
  for each row execute function public.set_updated_at();

insert into public.app_config (key, value, description) values
  ('referral_max_per_year', '10', 'Rewarded invites per person per year'),
  ('referral_redeem_days', '14', 'Days after sign-up in which a friend''s code can be entered'),
  ('referral_active_days', '3', 'Days with food logged before an invite is rewarded')
on conflict (key) do nothing;

/** The caller's invite code, created on first use (8 characters without 0/O/1/I). */
create function public.my_referral_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  existing text;
  candidate text;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if me is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  select code into existing from public.referral_codes where user_id = me;
  if existing is not null then
    return existing;
  end if;
  loop
    candidate := '';
    for i in 1..8 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    begin
      insert into public.referral_codes (user_id, code) values (me, candidate);
      return candidate;
    exception when unique_violation then
      -- Another code with the same letters (or a parallel call for this user): try again.
      select code into existing from public.referral_codes where user_id = me;
      if existing is not null then
        return existing;
      end if;
    end;
  end loop;
end;
$$;
revoke all on function public.my_referral_code() from public, anon;
grant execute on function public.my_referral_code() to authenticated;

/**
 * Enters a friend's code. Answers 'ok', 'invalid' (no such code), 'own' (your own code),
 * 'already' (you already used one), 'too_late' (more than referral_redeem_days after sign-up)
 * or 'limit' (the friend has reached this year's rewarded invites).
 */
create function public.redeem_referral(p_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  friend uuid;
  joined timestamptz;
begin
  if me is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  select created_at into joined from auth.users where id = me;
  if joined < now() - make_interval(days => public.config_number('referral_redeem_days', 14)::int) then
    return 'too_late';
  end if;
  if exists (select 1 from public.referrals where referred_id = me) then
    return 'already';
  end if;
  select user_id into friend from public.referral_codes
  where code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if friend is null then
    return 'invalid';
  end if;
  if friend = me then
    return 'own';
  end if;
  if (
    select count(*) from public.referrals
    where referrer_id = friend and status <> 'expired' and created_at > now() - interval '1 year'
  ) >= public.config_number('referral_max_per_year', 10) then
    return 'limit';
  end if;
  insert into public.referrals (referrer_id, referred_id) values (friend, me);
  return 'ok';
end;
$$;
revoke all on function public.redeem_referral(text) from public, anon;
grant execute on function public.redeem_referral(text) to authenticated;

/**
 * For referral-rewards (service role): pending invites whose new user has finished onboarding
 * and logged food on enough different days. Invites still pending after 60 days expire here.
 */
create function public.referral_candidates(p_limit integer)
returns table (id uuid, referrer_id uuid, referred_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.referrals set status = 'expired'
  where status = 'pending' and created_at < now() - interval '60 days';
  return query
    select r.id, r.referrer_id, r.referred_id
    from public.referrals r
    join public.profiles p on p.user_id = r.referred_id
    where r.status = 'pending'
      and p.onboarding_completed_at is not null
      and (
        select count(distinct (f.logged_at at time zone 'utc')::date)
        from public.food_logs f where f.user_id = r.referred_id
      ) >= public.config_number('referral_active_days', 3)
    order by r.created_at
    limit greatest(0, least(p_limit, 1000));
end;
$$;
revoke all on function public.referral_candidates(integer) from public, anon, authenticated;

/** Adds the referral settings to admin validation (see 20260930100000). */
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
  elsif p_key in ('referral_max_per_year', 'referral_redeem_days', 'referral_active_days') then
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
