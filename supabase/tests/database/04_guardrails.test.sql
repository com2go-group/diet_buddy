-- Health and safety guardrails enforced in the database (CLAUDE.md §9).
begin;
select no_plan();

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'a@example.com', '{"name":"  Alex  "}'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.com', '{}');

select is((select name from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'),
  'Alex', 'sign-up creates a profile with the trimmed name from metadata');
select is((select name from public.profiles where user_id = '22222222-2222-2222-2222-222222222222'),
  null, 'sign-up without a name leaves it empty');

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- Age gate
select throws_ok(
  $$ update public.profiles set birth_date = (current_date - interval '18 years' + interval '1 day')::date $$,
  '23514', null, 'under-18 birth dates are rejected');
select lives_ok(
  $$ update public.profiles set birth_date = (current_date - interval '18 years')::date $$,
  'users who turn 18 today are accepted');

-- Goal weight
update public.profiles set height_cm = 180;
select throws_ok(
  $$ insert into public.goals (goal_types, start_weight_kg, goal_weight_kg, pace)
     values ('{lose_fat}', 90, 59, 'balanced') $$,
  '23514', null, 'weight-loss goals below BMI 18.5 are blocked (59 kg at 180 cm)');
select throws_ok(
  $$ insert into public.goals (goal_types, start_weight_kg, goal_weight_kg, pace)
     values ('{lose_fat}', 90, 95, 'balanced') $$,
  '23514', null, 'weight-loss goals must be below the current weight');
select lives_ok(
  $$ insert into public.goals (goal_types, start_weight_kg, goal_weight_kg, pace)
     values ('{lose_fat}', 90, 60, 'balanced') $$,
  'a goal at BMI 18.5 or above is accepted (60 kg at 180 cm)');
select throws_ok(
  $$ update public.goals set goal_weight_kg = 55 $$,
  '23514', null, 'the BMI rule also applies when editing a goal');
select throws_ok(
  $$ insert into public.goals (goal_types) values ('{healthy_lifestyle}') $$,
  '23505', null, 'only one active goal per user');
select lives_ok(
  $$ insert into public.goals (goal_types, start_weight_kg, goal_weight_kg, active)
     values ('{build_muscle}', 70, 75, false) $$,
  'non-loss goals may target a higher weight');

-- Calorie floor as a last line of defence
select throws_ok(
  $$ insert into public.plans (version, daily_calories, protein_g, carbs_g, fat_g, fiber_g, water_ml)
     values (1, 1100, 100, 100, 40, 20, 2000) $$,
  '23514', null, 'plans below 1,200 kcal are rejected');
select lives_ok(
  $$ insert into public.plans (version, daily_calories, protein_g, carbs_g, fat_g, fiber_g, water_ml)
     values (1, 1200, 100, 100, 40, 20, 2000) $$,
  'a 1,200 kcal plan is accepted');

-- Input ranges
select throws_ok($$ insert into public.checkins (mood, energy) values ('good', 11) $$,
  '23514', null, 'energy must be 1–10');
select throws_ok($$ insert into public.water_logs (ml) values (0) $$,
  '23514', null, 'water entries must be positive');
select throws_ok($$ insert into public.food_logs (meal_slot, name, calories, source) values ('lunch', 'x', -5, 'manual') $$,
  '23514', null, 'calories cannot be negative');
select throws_ok(
  $$ insert into public.progress_photos (storage_path) values ('22222222-2222-2222-2222-222222222222/photo.jpg') $$,
  '23514', null, 'progress photo paths must sit under the owner''s folder');

select * from finish();
rollback;
