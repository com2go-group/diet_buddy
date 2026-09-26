-- Check-ins can only be made for today (±1 day for time zones), so XP can't be farmed.
begin;
select plan(5);

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'a@example.com');

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select throws_ok(
  $$ insert into public.checkins (date, mood, energy) values (current_date - 2, 'good', 7) $$,
  '22023', 'check-in date must be today', 'a back-dated check-in is rejected');
select throws_ok(
  $$ insert into public.checkins (date, mood, energy) values (current_date + 2, 'good', 7) $$,
  '22023', 'check-in date must be today', 'a future-dated check-in is rejected');
select lives_ok(
  $$ insert into public.checkins (date, mood, energy) values (current_date - 1, 'good', 7) $$,
  'yesterday (server time) is allowed: it can be today in a time zone behind UTC');
select lives_ok(
  $$ insert into public.checkins (date, mood, energy) values (current_date + 1, 'good', 7) $$,
  'tomorrow (server time) is allowed: it can be today in a time zone ahead of UTC');

reset role;
select is((select xp from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'),
  40, 'only the two accepted check-ins awarded XP');

select * from finish();
rollback;
