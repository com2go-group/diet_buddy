-- Streak freezes: earned every 7 days (max 2), used automatically for one recent missed day.
begin;
select plan(11);

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'a@example.com');
-- Activity from 9 days ago to 3 days ago (7 days), then nothing yesterday-but-one.
insert into public.food_logs (user_id, logged_at, meal_slot, name, calories, source)
  select '11111111-1111-1111-1111-111111111111', now() - make_interval(days => d), 'lunch', 'Soup', 300, 'manual'
  from generate_series(9, 3, -1) d;

select is((select streak_days from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'),
  0, 'activity that ended 3 days ago is not a current streak');
select is((select streak_freezes from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'),
  0, 'reaching 7 only through history recalculated later earns nothing retroactively');

-- Build a live streak: give the user a freeze to test, as if earned.
update public.profiles set streak_freezes = 1 where user_id = '11111111-1111-1111-1111-111111111111';
-- Missed 2 days ago only; back yesterday.
insert into public.food_logs (user_id, logged_at, meal_slot, name, calories, source)
  values ('11111111-1111-1111-1111-111111111111', now() - interval '1 day', 'lunch', 'Soup', 300, 'manual');

select is((select streak_days from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'),
  8, 'a freeze covers the single missed day: 7 days + yesterday');
select is((select count(*)::int from public.streak_freezes), 1, 'the covered day is recorded');
select is((select streak_freezes from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'),
  0, 'the freeze is used up');
select is((select count(*)::int from public.notifications where type = 'streak' and title like '%freeze%'),
  1, 'the user is told a freeze was used');

-- Logging again keeps the covered day (no second freeze needed) and earns nothing at 8→8.
insert into public.food_logs (user_id, logged_at, meal_slot, name, calories, source)
  values ('11111111-1111-1111-1111-111111111111', now(), 'lunch', 'Soup', 300, 'manual');
select is((select streak_days from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'),
  9, 'the covered day stays covered');

-- Earning: a second user reaches 7 days today.
insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'b@example.com');
insert into public.food_logs (user_id, logged_at, meal_slot, name, calories, source)
  select '22222222-2222-2222-2222-222222222222', now() - make_interval(days => d), 'lunch', 'Soup', 300, 'manual'
  from generate_series(6, 1, -1) d;
select is((select streak_freezes from public.profiles where user_id = '22222222-2222-2222-2222-222222222222'),
  0, 'no freeze before 7 days');
insert into public.food_logs (user_id, logged_at, meal_slot, name, calories, source)
  values ('22222222-2222-2222-2222-222222222222', now(), 'lunch', 'Soup', 300, 'manual'),
         ('22222222-2222-2222-2222-222222222222', now(), 'dinner', 'Rice', 400, 'manual');
select is((select streak_freezes from public.profiles where user_id = '22222222-2222-2222-2222-222222222222'),
  1, 'reaching a 7-day streak earns one freeze, once');

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select throws_ok($$ update public.profiles set streak_freezes = 2 $$, '42501', null,
  'users cannot give themselves freezes');
select throws_ok($$ insert into public.streak_freezes (user_id, day)
  values ('11111111-1111-1111-1111-111111111111', current_date - 30) $$, '42501', null,
  'users cannot cover days themselves');

select * from finish();
rollback;
