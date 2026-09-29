-- Cheaper free-tier AI: batch calls cost half and don't count against the day's budget; the
-- nightly batch picks active free users without tomorrow's plan; users can set their language.
begin;
select plan(10);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'active@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'idle@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'premium@example.com'),
  ('44444444-4444-4444-4444-444444444444', 'planned@example.com');
update public.profiles set onboarding_completed_at = now();
update public.profiles set is_premium = true where user_id = '33333333-3333-3333-3333-333333333333';
insert into public.plans (user_id, version, daily_calories, protein_g, carbs_g, fat_g, fiber_g, water_ml, generated_by)
  select id, 1, 1800, 120, 200, 60, 25, 2000, 'rules' from auth.users;
insert into public.food_logs (user_id, logged_at, meal_slot, name, calories, source)
  select id, now() - interval '1 day', 'lunch', 'Soup', 300, 'manual' from auth.users
  where id <> '22222222-2222-2222-2222-222222222222';
insert into public.meal_plans (user_id, date, meals)
  values ('44444444-4444-4444-4444-444444444444', current_date + 1, '{}');

select results_eq(
  $$ select user_id from public.batch_plan_candidates(current_date + 1, 100) $$,
  $$ values ('11111111-1111-1111-1111-111111111111'::uuid) $$,
  'only active free users without tomorrow''s plan are batched');
select is((select count(*)::int from public.batch_plan_candidates(current_date + 1, 0)), 0,
  'the batch size is capped');

select is(
  public.ai_cost_usd('claude-haiku-4-5', 1000000, 0, 0, 0,
    (select value from public.app_config where key = 'ai_prices'), true),
  0.5, 'batch calls cost half');

insert into public.ai_usage (user_id, function_name, model, input_tokens, output_tokens, batch)
values ('11111111-1111-1111-1111-111111111111', 'batch-meal-plans', 'claude-haiku-4-5', 100000, 0, true);
select is(
  (public.ai_allowance('11111111-1111-1111-1111-111111111111', now() - interval '1 hour',
    to_char(now(), 'YYYY-MM-DD'), false) ->> 'spent_usd')::numeric,
  0::numeric, 'overnight plans don''t count against the day''s budget');
select is(
  (public.ai_allowance('11111111-1111-1111-1111-111111111111', now() - interval '1 hour',
    to_char(now(), 'YYYY-MM-DD'), false) #>> '{limits,boost_coach}')::int,
  1, 'a video adds one coach message');

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select lives_ok($$ update public.profiles set language = 'el' $$, 'users set their language');
select throws_ok($$ update public.profiles set language = 'xx' $$, '23514', null,
  'only the app''s languages');
select throws_ok($$ select * from public.batch_plan_candidates(current_date, 10) $$, '42501', null,
  'the app cannot list batch candidates');
select throws_ok($$ select * from public.meal_plan_batches $$, '42501', null,
  'batch records are server-only');
select throws_ok($$ select * from public.usda_food_cache $$, '42501', null,
  'the USDA cache is server-only');

select * from finish();
rollback;
