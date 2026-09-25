-- Server-owned tables and columns are read-only to the app, even for the row's owner.
begin;
select no_plan();

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'a@example.com');
insert into public.notifications (user_id, type, title)
  values ('11111111-1111-1111-1111-111111111111', 'tip', 'Drink water');
insert into public.coach_conversations (user_id, persona)
  values ('11111111-1111-1111-1111-111111111111', 'aria');

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select lives_ok($$ update public.profiles set name = 'Alex', units = 'imperial', height_cm = 180 $$,
  'users can edit their own profile details');
select throws_ok($$ update public.profiles set is_premium = true $$, '42501', null,
  'users cannot grant themselves premium');
select throws_ok($$ update public.profiles set xp = 99999 $$, '42501', null,
  'users cannot set their XP');
select throws_ok($$ update public.profiles set streak_days = 365 $$, '42501', null,
  'users cannot set their streak');
select throws_ok($$ insert into public.profiles (user_id) values (auth.uid()) $$, '42501', null,
  'users cannot create profiles (created on sign-up)');

select throws_ok(
  $$ insert into public.ad_unlocks (user_id, unlock_type, target_id) values (auth.uid(), 'meal_plan', '2026-09-25') $$,
  '42501', null, 'users cannot record their own ad unlocks');
select throws_ok(
  $$ insert into public.coach_messages (conversation_id, user_id, persona, role, content)
     select id, auth.uid(), 'aria', 'user', 'hi' from public.coach_conversations $$,
  '42501', null, 'coach messages are written only by coach-chat (limit enforced there)');
select throws_ok(
  $$ insert into public.user_achievements (user_id, achievement_id) select auth.uid(), id from public.achievements limit 1 $$,
  '42501', null, 'users cannot unlock achievements themselves');
select throws_ok(
  $$ insert into public.meal_plans (user_id, date, meals) values (auth.uid(), current_date, '{}') $$,
  '42501', null, 'meal plans are written only by generate-meal-plan');
select throws_ok($$ select * from public.ai_usage $$, '42501', null, 'AI usage is not visible to users');
select throws_ok($$ insert into public.achievements (code, title, description) values ('x', 'x', 'x') $$,
  '42501', null, 'users cannot add achievements');
select throws_ok($$ update public.app_config set value = '1000' $$, '42501', null,
  'users cannot raise their coach limit');

select is((select count(*)::int from public.achievements), 6, 'users can read the achievements catalogue');

select lives_ok(
  $$ insert into public.plans (version, daily_calories, protein_g, carbs_g, fat_g, fiber_g, water_ml)
     values (1, 2000, 150, 200, 67, 28, 2800) $$,
  'users can save a plan version');
select throws_ok($$ update public.plans set daily_calories = 900 $$, '42501', null,
  'plan versions are immutable');

select lives_ok($$ update public.notifications set read_at = now() $$, 'users can mark notifications read');
select throws_ok($$ update public.notifications set title = 'Buy now' $$, '42501', null,
  'users cannot rewrite notifications');

select lives_ok($$ insert into public.checkins (mood, energy) values ('good', 7) $$, 'users can check in');
select throws_ok($$ update public.checkins set date = current_date - 1 $$, '42501', null,
  'check-in dates cannot be moved (XP is awarded per day)');

select lives_ok($$ delete from public.coach_conversations $$, 'users can delete their coach history');

select lives_ok($$ insert into public.body_metrics (weight_kg, body_fat_pct, user_overridden) values (80, 22.5, true) $$,
  'users can record body metrics');
select lives_ok($$ update public.body_metrics set bmr = 1800 $$, 'users can edit their body metrics');
select throws_ok(
  $$ insert into public.body_metrics (weight_kg, checkin_id) select 80, id from public.checkins limit 1 $$,
  '42501', null, 'users cannot link body metrics to a check-in (trigger-owned)');
select throws_ok($$ update public.body_metrics set checkin_id = null $$, '42501', null,
  'users cannot relink body metrics');
select throws_ok($$ update public.body_metrics set user_id = gen_random_uuid() $$, '42501', null,
  'users cannot move body metrics to another user');

select * from finish();
rollback;
