-- Premium status: set only by the webhook's function, newest event wins, users can't touch it.
begin;
select plan(6);

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'a@example.com');

select ok(public.apply_premium_event('11111111-1111-1111-1111-111111111111', true, '2026-09-27 10:00+00'),
  'a purchase event is applied');
select is((select is_premium from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'),
  true, 'the user is premium');
select ok(not public.apply_premium_event('11111111-1111-1111-1111-111111111111', false, '2026-09-27 09:00+00'),
  'an older event arriving late is ignored');
select is((select is_premium from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'),
  true, 'still premium after the stale event');

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select throws_ok(
  $$ select public.apply_premium_event('11111111-1111-1111-1111-111111111111', true, now()) $$,
  '42501', null, 'users cannot call the webhook function');
select throws_ok(
  $$ update public.profiles set premium_event_at = now() $$,
  '42501', null, 'users cannot write premium_event_at');

select * from finish();
rollback;
