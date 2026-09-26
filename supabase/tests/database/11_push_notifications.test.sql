-- Push tokens and preferences are private to each user; streak milestones and weekly reports
-- create notifications on the server.
begin;
select plan(13);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.com');

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
insert into public.push_tokens (token, platform) values ('ExponentPushToken[aaa]', 'ios');
insert into public.notification_preferences (meal_reminders) values (false);
select is((select count(*)::integer from public.push_tokens), 1, 'a user registers their token');
select is((select promotions from public.notification_preferences), false, 'promotions are off by default');

set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select is((select count(*)::integer from public.push_tokens), 0, 'tokens are private');
select is((select count(*)::integer from public.notification_preferences), 0, 'preferences are private');
select throws_ok(
  $$ insert into public.push_tokens (user_id, token, platform)
     values ('11111111-1111-1111-1111-111111111111', 'ExponentPushToken[bbb]', 'android') $$,
  '42501', null, 'users cannot register tokens for someone else');
select throws_ok($$ update public.notifications set pushed_at = now() $$, '42501', null,
  'users cannot mark notifications as pushed');

-- A device moving to another account takes its token along.
select lives_ok($$ select public.register_push_token('ExponentPushToken[aaa]', 'ios') $$,
  'user B registers the device user A used');
reset role;
select is((select user_id::text from public.push_tokens where token = 'ExponentPushToken[aaa]'),
  '22222222-2222-2222-2222-222222222222', 'the token now belongs only to user B');
-- Streak milestones.
update public.profiles set streak_days = 2 where user_id = '11111111-1111-1111-1111-111111111111';
select is((select count(*)::integer from public.notifications where type = 'streak'), 0, 'no notification for a 2-day streak');
update public.profiles set streak_days = 3 where user_id = '11111111-1111-1111-1111-111111111111';
select is((select title from public.notifications where type = 'streak'), '🔥 3-day streak!', 'a 3-day streak is celebrated');

-- Weekly report for users who logged food.
insert into public.food_logs (user_id, logged_at, meal_slot, name, calories, source)
select '11111111-1111-1111-1111-111111111111', now() - make_interval(days => d), 'lunch', 'Meal', 600, 'manual'
from generate_series(0, 3) d;
insert into public.body_metrics (user_id, measured_at, weight_kg) values
  ('11111111-1111-1111-1111-111111111111', now() - interval '6 days', 81.0),
  ('11111111-1111-1111-1111-111111111111', now(), 80.4);
select is(public.create_weekly_reports(), 1, 'one report for the one active user');
select is((select body from public.notifications where type = 'weekly_report'),
  'You logged food on 4 of the last 7 days and your weight is down 0.6 kg. Tap to see your progress.',
  'the report summarises logging days and weight change');

set local role authenticated;
select throws_ok($$ select public.create_weekly_reports() $$, '42501', null, 'only the scheduler creates reports');

select * from finish();
rollback;
