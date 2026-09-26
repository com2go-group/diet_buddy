-- Achievements (CLAUDE.md §7.8, §7.15): progress is computed from the user's own data and
-- unlocks happen here, never in the app, so they can't be faked. Days are UTC dates, as for
-- streaks (see docs/backend.md).

-- Progress towards every achievement for one user. `current` is capped at `target`.
create function public.achievement_progress(target_user uuid)
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
  )
  select r.code, least(r.current, r.target), r.target from raw r;
$$;

-- Unlocks every achievement whose progress is complete, once, with its XP and a notification.
create function public.evaluate_achievements(target_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a record;
begin
  for a in
    select ach.id, ach.title, ach.emoji, ach.xp_reward
    from public.achievement_progress(target_user) p
    join public.achievements ach on ach.code = p.code
    where p.current >= p.target
      and not exists (
        select 1 from public.user_achievements u
        where u.user_id = target_user and u.achievement_id = ach.id
      )
  loop
    insert into public.user_achievements (user_id, achievement_id)
      values (target_user, a.id)
      on conflict (user_id, achievement_id) do nothing;
    if found then
      perform public.award_xp(target_user, a.xp_reward);
      insert into public.notifications (user_id, type, title, body)
        values (target_user, 'achievement',
                concat_ws(' ', a.emoji, 'Achievement unlocked:', a.title),
                format('+%s XP', a.xp_reward));
    end if;
  end loop;
end;
$$;

create function public.on_activity_evaluate_achievements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.evaluate_achievements(new.user_id);
  return new;
end;
$$;

-- Named "zz_" so they run after the streak and weight-trend triggers (same event, name order).
create trigger zz_evaluate_achievements after insert on public.food_logs
  for each row execute function public.on_activity_evaluate_achievements();
create trigger zz_evaluate_achievements after insert on public.water_logs
  for each row execute function public.on_activity_evaluate_achievements();
create trigger zz_evaluate_achievements after insert on public.checkins
  for each row execute function public.on_activity_evaluate_achievements();
create trigger zz_evaluate_achievements after insert on public.body_metrics
  for each row execute function public.on_activity_evaluate_achievements();

-- The app reads its own progress only.
create function public.my_achievement_progress()
returns table (code text, current numeric, target numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.achievement_progress(auth.uid()) where auth.uid() is not null;
$$;

revoke execute on function public.achievement_progress(uuid) from public, anon, authenticated;
revoke execute on function public.evaluate_achievements(uuid) from public, anon, authenticated;
revoke execute on function public.on_activity_evaluate_achievements() from public, anon, authenticated;
revoke execute on function public.my_achievement_progress() from public, anon;
grant execute on function public.my_achievement_progress() to authenticated;
