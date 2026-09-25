-- set_consent(): the app's way to record consent.
begin;
select no_plan();

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.com');

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select throws_ok(
  $$ insert into public.consents (user_id, consent_type, granted, version)
     values (auth.uid(), 'health_data', true, 'v1')
     on conflict (user_id, consent_type) do update
     set user_id = excluded.user_id, consent_type = excluded.consent_type,
         granted = excluded.granted, version = excluded.version $$,
  '42501', null, 'a full-row upsert (what PostgREST sends) is not allowed');

select lives_ok($$ select public.set_consent('health_data', true, 'v1') $$, 'set_consent records a new consent');
select lives_ok($$ select public.set_consent('health_data', false, 'v1') $$, 'set_consent updates an existing consent');
select lives_ok($$ select public.set_consent('marketing', false, 'v1') $$, 'set_consent records another type');

select results_eq(
  $$ select consent_type::text, granted from public.consents order by consent_type $$,
  $$ values ('health_data', false), ('marketing', false) $$,
  'one row per consent type, holding the latest choice');
select is((select count(*)::int from public.consent_events), 3, 'every change is in the audit trail');

set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select lives_ok($$ select public.set_consent('health_data', true, 'v1') $$, 'another user records their own consent');
select is((select count(*)::int from public.consents), 1, 'and only sees their own');

set local role anon;
select throws_ok($$ select public.set_consent('health_data', true, 'v1') $$, '42501', null,
  'anonymous callers cannot record consent');

select * from finish();
rollback;
