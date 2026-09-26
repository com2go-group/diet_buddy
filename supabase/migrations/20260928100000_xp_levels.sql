-- XP for everyday logging (CLAUDE.md §7.15) and more achievements. Every award is recorded in
-- xp_events with a unique (reason, ref), so deleting and re-logging can't earn XP twice.

create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  reason text not null,
  ref text not null,
  amount integer not null check (amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, reason, ref)
);
create index xp_events_user_created on public.xp_events (user_id, created_at desc);
create trigger set_updated_at before update on public.xp_events
  for each row execute function public.set_updated_at();

alter table public.xp_events enable row level security;
grant select on public.xp_events to authenticated;
create policy "own rows: select" on public.xp_events for select to authenticated
  using (user_id = (select auth.uid()));

-- Awards XP once per (user, reason, ref). Returns whether it was awarded now.
create function public.grant_xp_once(target_user uuid, p_reason text, p_ref text, p_amount integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.xp_events (user_id, reason, ref, amount)
  values (target_user, p_reason, p_ref, p_amount)
  on conflict (user_id, reason, ref) do nothing;
  if found then
    perform public.award_xp(target_user, p_amount);
  end if;
  return found;
end;
$$;

-- +5 XP for the first food logged in each meal of a day (so at most 20 a day).
create function public.xp_on_food_logged()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.grant_xp_once(new.user_id, 'meal_logged', (new.logged_at::date)::text || ':' || new.meal_slot, 5);
  return new;
end;
$$;

-- +10 XP the first time each day's water reaches the plan's goal.
create function public.xp_on_water_logged()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  goal integer;
  total integer;
begin
  select water_ml into goal from public.plans where user_id = new.user_id order by version desc limit 1;
  if goal is null then
    return new;
  end if;
  select coalesce(sum(ml), 0) into total from public.water_logs
    where user_id = new.user_id and logged_at::date = new.logged_at::date;
  if total >= goal then
    perform public.grant_xp_once(new.user_id, 'water_goal', (new.logged_at::date)::text, 10);
  end if;
  return new;
end;
$$;

-- Named to run after the streak trigger and before the achievements check (triggers fire by name).
create trigger xp_food_logged after insert on public.food_logs
  for each row execute function public.xp_on_food_logged();
create trigger xp_water_logged after insert on public.water_logs
  for each row execute function public.xp_on_water_logged();

insert into public.achievements (code, title, description, emoji, xp_reward) values
  ('first_log', 'First Bite', 'Log your first meal', '🍽️', 10),
  ('hydration_starter', 'Hydrated', 'Hit your water goal for the first time', '🥤', 20),
  ('check_in_7', 'Check-In Champ', 'Complete 7 daily check-ins', '✅', 50),
  ('plan_follower', 'Plan Follower', 'Log 10 items from your AI meal plan', '📋', 60),
  ('streak_30', '30 Day Streak', 'Log every day for 30 days', '🌟', 300)
on conflict (code) do update
  set title = excluded.title, description = excluded.description,
      emoji = excluded.emoji, xp_reward = excluded.xp_reward;

create or replace function public.achievement_progress(target_user uuid)
returns table (code text, current numeric, target numeric)
language sql
stable
security definer
set search_path = ''
as $$
  with plan as (
    select daily_calories, protein_g, water_ml
    from public.plans where user_id = target_user
    order by version desc limit 1
  ),
  food_days as (
    select f.logged_at::date as day, sum(f.calories) as kcal, sum(f.protein_g) as protein
    from public.food_logs f where f.user_id = target_user
    group by 1
  ),
  hydrated as (
    select w.logged_at::date as day
    from public.water_logs w, plan p
    where w.user_id = target_user
    group by 1, p.water_ml
    having sum(w.ml) >= p.water_ml
  ),
  -- Consecutive days share (day - row_number).
  hydrated_runs as (
    select count(*) as days
    from (select day, day - (row_number() over (order by day))::integer as run from hydrated) r
    group by run
  ),
  weight as (
    select
      (select g.start_weight_kg from public.goals g
        where g.user_id = target_user and g.active and 'lose_fat' = any (g.goal_types)
        order by g.created_at desc limit 1) as start_kg,
      (select m.weight_kg from public.body_metrics m
        where m.user_id = target_user and m.weight_kg is not null
        order by m.measured_at desc limit 1) as latest_kg
  ),
  raw (code, current, target) as (
    select 'streak_12', p.streak_days::numeric, 12::numeric
      from public.profiles p where p.user_id = target_user
    union all
    select 'two_week_warrior', p.streak_days::numeric, 14
      from public.profiles p where p.user_id = target_user
    union all
    -- "Within" the target (±10%), not under it: undereating is not rewarded (§9).
    select 'clean_eater', count(*)::numeric, 5
      from food_days f, plan p
      where f.kcal between p.daily_calories * 0.9 and p.daily_calories * 1.1
    union all
    select 'hydration_hero', coalesce((select max(days) from hydrated_runs), 0)::numeric, 7
    union all
    select 'protein_pro', count(*)::numeric, 10
      from food_days f, plan p
      where f.protein >= p.protein_g
    union all
    select 'scale_master', greatest(coalesce(w.start_kg - w.latest_kg, 0), 0), 2
      from weight w
    union all
    select 'first_log', least((select count(*) from public.food_logs f where f.user_id = target_user), 1)::numeric, 1
    union all
    select 'hydration_starter', least((select count(*) from hydrated), 1)::numeric, 1
    union all
    select 'check_in_7', (select count(*) from public.checkins c where c.user_id = target_user)::numeric, 7
    union all
    select 'streak_30', p.streak_days::numeric, 30
      from public.profiles p where p.user_id = target_user
    union all
    select 'plan_follower', (select count(*) from public.food_logs f where f.user_id = target_user and f.source = 'plan')::numeric, 10
  )
  select r.code, least(r.current, r.target), r.target from raw r;
$$;

revoke execute on function public.grant_xp_once(uuid, text, text, integer) from public, anon, authenticated;
revoke execute on function public.xp_on_food_logged() from public, anon, authenticated;
revoke execute on function public.xp_on_water_logged() from public, anon, authenticated;
revoke execute on function public.achievement_progress(uuid) from public, anon, authenticated;
