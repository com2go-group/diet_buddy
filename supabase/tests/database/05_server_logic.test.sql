-- XP, streaks, weight trend, consent audit and account deletion.
begin;
select no_plan();

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.com');

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

insert into public.checkins (mood, energy, sleep_hours, hunger, weight_kg)
  values ('good', 7, 7.5, 'normal', 80);

reset role;
select is((select xp from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'),
  20, 'a check-in awards 20 XP');
select is((select streak_days from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'),
  1, 'a check-in today starts a 1-day streak');
select is((select weight_kg from public.body_metrics where user_id = '11111111-1111-1111-1111-111111111111'),
  80.00, 'check-in weight is added to the weight trend');

set local role authenticated;
select throws_ok($$ insert into public.checkins (mood, energy) values ('great', 9) $$, '23505', null,
  'only one check-in per day, so XP cannot be farmed');
update public.checkins set weight_kg = 79.4;
insert into public.food_logs (logged_at, meal_slot, name, calories, source)
  values (now() - interval '1 day', 'dinner', 'Salmon', 520, 'manual');

reset role;
select is((select xp from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'),
  35, 'the rejected second check-in awarded nothing (20 check-in + 5 meal logged + 10 First Bite)');
select results_eq(
  $$ select weight_kg from public.body_metrics where user_id = '11111111-1111-1111-1111-111111111111' $$,
  $$ values (79.40::numeric(5,2)) $$, 'editing check-in weight updates the same trend point');
select is((select streak_days from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'),
  2, 'a food log yesterday plus a check-in today is a 2-day streak');

set local role authenticated;
update public.checkins set weight_kg = null;
reset role;
select is_empty($$ select 1 from public.body_metrics where user_id = '11111111-1111-1111-1111-111111111111' $$,
  'clearing check-in weight removes its trend point');

-- Streak that ended yesterday still counts; an older gap resets it.
set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
insert into public.food_logs (logged_at, meal_slot, name, calories, source)
  values (now() - interval '3 days', 'lunch', 'Soup', 200, 'manual');
reset role;
select is((select streak_days from public.profiles where user_id = '22222222-2222-2222-2222-222222222222'),
  0, 'activity three days ago is not a current streak');
set local role authenticated;
insert into public.food_logs (logged_at, meal_slot, name, calories, source)
  values (now() - interval '1 day', 'lunch', 'Soup', 200, 'manual');
reset role;
select is((select streak_days from public.profiles where user_id = '22222222-2222-2222-2222-222222222222'),
  1, 'activity yesterday keeps a 1-day streak alive');

-- Consent audit trail
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
insert into public.consents (consent_type, granted, version) values ('health_data', true, '2026-09');
update public.consents set granted = false;
update public.consents set granted = false;
select results_eq(
  $$ select granted from public.consent_events order by created_at, granted desc $$,
  $$ values (true), (false) $$, 'each consent change is logged once; no-op updates are not');
select throws_ok($$ delete from public.consent_events $$, '42501', null,
  'the consent audit trail cannot be deleted by the user');

-- Rewarded ad unlock recorded by the server
reset role;
insert into public.ad_unlocks (user_id, unlock_type, target_id)
  values ('11111111-1111-1111-1111-111111111111', 'meal_plan', current_date::text);
select is((select xp from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'),
  85, 'a meal-plan ad unlock awards 50 XP');
select throws_ok(
  $$ insert into public.ad_unlocks (user_id, unlock_type, target_id)
     values ('11111111-1111-1111-1111-111111111111', 'meal_plan', current_date::text) $$,
  '23505', null, 'the same day cannot be unlocked twice');

-- Account deletion hard-deletes everything (CLAUDE.md §13)
delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
select is(
  (select count(*)::int from (
     select user_id from public.profiles union all select user_id from public.checkins
     union all select user_id from public.food_logs union all select user_id from public.body_metrics
     union all select user_id from public.consents union all select user_id from public.consent_events
     union all select user_id from public.ad_unlocks
   ) rows where user_id = '11111111-1111-1111-1111-111111111111'),
  0, 'deleting the auth user deletes all of their rows');
select is((select count(*)::int from public.profiles), 1, 'other users are untouched');

select * from finish();
rollback;
