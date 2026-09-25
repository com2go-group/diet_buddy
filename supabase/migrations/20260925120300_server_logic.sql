-- Server-side rules that must not depend on the app behaving (CLAUDE.md §7.15, §9, §13).
-- Security-definer functions pin search_path and are not executable by app roles.

-- ─── New auth user → profile ────────────────────────────────────────────────
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, name)
  values (new.id, nullif(left(trim(new.raw_user_meta_data ->> 'name'), 80), ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Age gate: 18+ (CLAUDE.md §9) ───────────────────────────────────────────
create function public.enforce_adult_birth_date()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.birth_date is not null and new.birth_date > (current_date - interval '18 years')::date then
    raise exception 'DietBuddy is only available to people aged 18 or over'
      using errcode = 'check_violation', hint = 'age_gate';
  end if;
  return new;
end;
$$;

create trigger enforce_adult_birth_date
  before insert or update of birth_date on public.profiles
  for each row execute function public.enforce_adult_birth_date();

-- ─── Weight-loss goals: below current weight, goal BMI ≥ 18.5 (CLAUDE.md §9) ─
create function public.validate_goal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  height numeric;
begin
  if not ('lose_fat' = any (new.goal_types)) or new.goal_weight_kg is null then
    return new;
  end if;
  if new.start_weight_kg is not null and new.goal_weight_kg >= new.start_weight_kg then
    raise exception 'Goal weight must be below the current weight'
      using errcode = 'check_violation', hint = 'goal_not_below_current';
  end if;
  select p.height_cm into height from public.profiles p where p.user_id = new.user_id;
  if height is not null and public.bmi(new.goal_weight_kg, height) < 18.5 then
    raise exception 'Goal weight is below a healthy BMI of 18.5'
      using errcode = 'check_violation', hint = 'goal_bmi_too_low';
  end if;
  return new;
end;
$$;

create trigger validate_goal
  before insert or update of goal_types, goal_weight_kg, start_weight_kg on public.goals
  for each row execute function public.validate_goal();

-- ─── Consent audit trail (GDPR: demonstrable consent) ──────────────────────
create function public.log_consent_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.granted = old.granted and new.version = old.version then
    return new;
  end if;
  insert into public.consent_events (user_id, consent_type, granted, version)
  values (new.user_id, new.consent_type, new.granted, new.version);
  return new;
end;
$$;

create trigger log_consent_event
  after insert or update on public.consents
  for each row execute function public.log_consent_event();

-- ─── XP and streaks ────────────────────────────────────────────────────────
create function public.award_xp(target_user uuid, amount integer)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set xp = xp + greatest(amount, 0) where user_id = target_user;
$$;

-- Streak = consecutive days, ending today or yesterday, with a check-in or a food log.
create function public.refresh_streak(target_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  streak integer := 0;
  day date := current_date;
begin
  if not public.has_activity_on(target_user, day) then
    day := day - 1;
  end if;
  while public.has_activity_on(target_user, day) loop
    streak := streak + 1;
    day := day - 1;
  end loop;
  update public.profiles set streak_days = streak where user_id = target_user;
end;
$$;

create function public.has_activity_on(target_user uuid, day date)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.checkins c where c.user_id = target_user and c.date = day)
      or exists (
        select 1 from public.food_logs f
        where f.user_id = target_user and f.logged_at::date = day
      );
$$;

-- Check-in: +20 XP once per day (unique user/date), streak refresh (CLAUDE.md §7.9).
create function public.on_checkin_inserted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.award_xp(new.user_id, 20);
  perform public.refresh_streak(new.user_id);
  return new;
end;
$$;

create trigger on_checkin_inserted
  after insert on public.checkins
  for each row execute function public.on_checkin_inserted();

create function public.on_food_logged()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_streak(new.user_id);
  return new;
end;
$$;

create trigger on_food_logged
  after insert on public.food_logs
  for each row execute function public.on_food_logged();

-- Check-in weight feeds the weight trend: one body_metrics row per check-in, kept in sync.
alter table public.body_metrics
  add column checkin_id uuid unique references public.checkins (id) on delete cascade;

-- checkin_id is set only by the trigger below. Foreign-key checks ignore RLS, so letting users
-- write it would let them attach rows to someone else's check-in.
revoke insert, update on public.body_metrics from authenticated;
grant insert (measured_at, source, weight_kg, body_fat_pct, lean_mass_kg, fat_mass_kg, waist_cm,
  bmr, tdee, bmi, user_overridden, user_id) on public.body_metrics to authenticated;
grant update (measured_at, source, weight_kg, body_fat_pct, lean_mass_kg, fat_mass_kg, waist_cm,
  bmr, tdee, bmi, user_overridden) on public.body_metrics to authenticated;

create function public.sync_checkin_weight()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.weight_kg is null then
    delete from public.body_metrics where checkin_id = new.id;
    return new;
  end if;
  insert into public.body_metrics (user_id, measured_at, source, weight_kg, checkin_id)
  values (new.user_id, now(), 'manual', new.weight_kg, new.id)
  on conflict (checkin_id) do update set weight_kg = excluded.weight_kg;
  return new;
end;
$$;

create trigger sync_checkin_weight
  after insert or update of weight_kg on public.checkins
  for each row execute function public.sync_checkin_weight();

-- Rewarded-ad unlocks (recorded by the server on the AdMob reward callback):
-- +50 XP for a day's meal plan, +100 XP for the initial AI plan (prototype values).
create function public.on_ad_unlocked()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.award_xp(new.user_id, case new.unlock_type when 'meal_plan' then 50 else 100 end);
  return new;
end;
$$;

create trigger on_ad_unlocked
  after insert on public.ad_unlocks
  for each row execute function public.on_ad_unlocked();

-- ─── Lock down function execution ──────────────────────────────────────────
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.bmi(numeric, numeric) to authenticated;
