-- Achievements unlock on the server from the user's own data, once, with XP and a notification.
begin;
select plan(14);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.com');
insert into public.plans (user_id, version, daily_calories, protein_g, carbs_g, fat_g, fiber_g, water_ml)
  values ('11111111-1111-1111-1111-111111111111', 1, 2000, 150, 200, 67, 28, 2000);
insert into public.goals (user_id, goal_types, start_weight_kg, goal_weight_kg, pace)
  values ('11111111-1111-1111-1111-111111111111', '{lose_fat}', 82, 70, 'balanced');

-- Five days within ±10% of 2,000 kcal (and one day under, which must not count).
insert into public.food_logs (user_id, logged_at, meal_slot, name, calories, protein_g, source)
select '11111111-1111-1111-1111-111111111111', now() - make_interval(days => d), 'lunch', 'Meal',
       case when d = 5 then 1200 else 1950 end, 160, 'manual'
from generate_series(1, 4) d;
insert into public.food_logs (user_id, logged_at, meal_slot, name, calories, protein_g, source)
  values ('11111111-1111-1111-1111-111111111111', now() - interval '6 days', 'lunch', 'Small', 1200, 20, 'manual');

select is(
  (select current from public.achievement_progress('11111111-1111-1111-1111-111111111111') where code = 'clean_eater'),
  4::numeric, 'four days within the calorie target so far; the undereating day does not count');
select is(
  (select count(*)::integer from public.user_achievements), 0, 'nothing unlocked yet');

insert into public.food_logs (user_id, logged_at, meal_slot, name, calories, protein_g, source)
  values ('11111111-1111-1111-1111-111111111111', now() - interval '5 days', 'lunch', 'Meal', 2100, 160, 'manual');

select is(
  (select a.code from public.user_achievements u join public.achievements a on a.id = u.achievement_id
    where u.user_id = '11111111-1111-1111-1111-111111111111'),
  'clean_eater', 'the fifth day on target unlocks Clean Eater');
select is(
  (select xp from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'),
  80, 'Clean Eater awards its 80 XP');
select is(
  (select title from public.notifications where user_id = '11111111-1111-1111-1111-111111111111'),
  '🥗 Achievement unlocked: Clean Eater', 'a notification announces the unlock');

insert into public.food_logs (user_id, logged_at, meal_slot, name, calories, protein_g, source)
  values ('11111111-1111-1111-1111-111111111111', now() - interval '8 days', 'lunch', 'Meal', 2000, 160, 'manual');
select is(
  (select xp from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'),
  80, 'an achievement is awarded only once');

select is(
  (select current from public.achievement_progress('11111111-1111-1111-1111-111111111111') where code = 'protein_pro'),
  6::numeric, 'protein days counted against the plan target');

-- Hydration Hero needs 7 consecutive days at the water goal.
insert into public.water_logs (user_id, logged_at, ml)
select '11111111-1111-1111-1111-111111111111', now() - make_interval(days => d), 2000
from generate_series(1, 6) d;
insert into public.water_logs (user_id, logged_at, ml)
  values ('11111111-1111-1111-1111-111111111111', now() - interval '9 days', 2000);
select is(
  (select current from public.achievement_progress('11111111-1111-1111-1111-111111111111') where code = 'hydration_hero'),
  6::numeric, 'the longest run of hydrated days is 6 (a gap breaks it)');
insert into public.water_logs (user_id, logged_at, ml)
  values ('11111111-1111-1111-1111-111111111111', now() - interval '7 days', 1000),
         ('11111111-1111-1111-1111-111111111111', now() - interval '7 days', 1000);
select ok(
  exists (select 1 from public.user_achievements u join public.achievements a on a.id = u.achievement_id
          where u.user_id = '11111111-1111-1111-1111-111111111111' and a.code = 'hydration_hero'),
  'the seventh consecutive day unlocks Hydration Hero');

-- Scale Master: 2 kg below the goal's starting weight.
insert into public.body_metrics (user_id, measured_at, weight_kg)
  values ('11111111-1111-1111-1111-111111111111', now(), 80.5);
select is(
  (select current from public.achievement_progress('11111111-1111-1111-1111-111111111111') where code = 'scale_master'),
  1.5, '1.5 kg lost so far');
insert into public.body_metrics (user_id, measured_at, weight_kg)
  values ('11111111-1111-1111-1111-111111111111', now() + interval '1 minute', 79.9);
select ok(
  exists (select 1 from public.user_achievements u join public.achievements a on a.id = u.achievement_id
          where u.user_id = '11111111-1111-1111-1111-111111111111' and a.code = 'scale_master'),
  'losing 2 kg unlocks Scale Master');

-- Users read only their own progress and cannot evaluate or unlock.
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select is(
  (select current from public.my_achievement_progress() where code = 'clean_eater'),
  0::numeric, 'another user sees only their own progress (none yet)');
select throws_ok(
  $$ select public.evaluate_achievements('22222222-2222-2222-2222-222222222222') $$,
  '42501', null, 'users cannot run the evaluator directly');
select throws_ok(
  $$ select * from public.achievement_progress('11111111-1111-1111-1111-111111111111') $$,
  '42501', null, 'users cannot read someone else''s progress');

select * from finish();
rollback;
