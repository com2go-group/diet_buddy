-- Referrals: codes, redeeming with every guard, and who can see what.
begin;
select plan(13);

insert into auth.users (id, email, created_at) values
  ('11111111-1111-1111-1111-111111111111', 'referrer@example.com', now() - interval '90 days'),
  ('22222222-2222-2222-2222-222222222222', 'new@example.com', now() - interval '2 days'),
  ('33333333-3333-3333-3333-333333333333', 'old@example.com', now() - interval '30 days'),
  ('44444444-4444-4444-4444-444444444444', 'other@example.com', now() - interval '1 day');

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select matches(public.my_referral_code(), '^[A-HJ-NP-Z2-9]{8}$', 'a code is created on first use');
select is(public.my_referral_code(), (select code from public.referral_codes), 'and stays the same');
select is(public.redeem_referral(public.my_referral_code()), 'too_late', 'old accounts can''t redeem');

set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select is(public.redeem_referral('NOPE2345'), 'invalid', 'unknown codes are refused');
select is(public.redeem_referral(public.my_referral_code()), 'own', 'your own code is refused');
reset role;
select set_config('test.code', (select code from public.referral_codes where user_id = '11111111-1111-1111-1111-111111111111'), true);
set local role authenticated;
select is(public.redeem_referral(lower(current_setting('test.code'))), 'ok', 'a friend''s code works (any case)');
select is(public.redeem_referral(current_setting('test.code')), 'already', 'only one code per person');
select is((select count(*)::int from public.referrals), 1, 'the new user sees their referral');

set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
select is(public.redeem_referral(current_setting('test.code')), 'too_late', 'codes only in the first 14 days');
select is((select count(*)::int from public.referrals), 0, 'others'' referrals are hidden');
select throws_ok($$ insert into public.referrals (referrer_id, referred_id) values
  ('33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444') $$,
  '42501', null, 'referrals can''t be written directly');
select throws_ok($$ select * from public.referral_candidates(10) $$, '42501', null,
  'candidates are server-only');

reset role;
-- The new user finishes onboarding and logs food on 3 days.
update public.profiles set onboarding_completed_at = now() where user_id = '22222222-2222-2222-2222-222222222222';
insert into public.food_logs (user_id, logged_at, meal_slot, name, calories, source)
  select '22222222-2222-2222-2222-222222222222', now() - make_interval(days => d), 'lunch', 'Soup', 300, 'manual'
  from generate_series(0, 2) d;
select is((select count(*)::int from public.referral_candidates(10)), 1,
  'an active new user makes the invite ready to reward');

select * from finish();
rollback;
