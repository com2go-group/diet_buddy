-- The avatar look is user-editable but only in the expected shape.
begin;
select plan(5);

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'a@example.com');
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select lives_ok(
  $$ update public.profiles set avatar = '{"variant":"other","skin":3,"hair":5}' $$,
  'a valid look can be saved');
select is((select avatar ->> 'variant' from public.profiles), 'other', 'and is stored');
select throws_ok(
  $$ update public.profiles set avatar = '{"variant":"robot","skin":1,"hair":1}' $$,
  '23514', null, 'unknown variants are rejected');
select throws_ok(
  $$ update public.profiles set avatar = '{"variant":"male","skin":9,"hair":1}' $$,
  '23514', null, 'out-of-range tones are rejected');
select throws_ok(
  $$ update public.profiles set avatar = '{"variant":"male","skin":1,"hair":1,"x":"<script>"}' $$,
  '23514', null, 'extra keys are rejected');

select * from finish();
rollback;
