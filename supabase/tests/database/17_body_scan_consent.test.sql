-- Body photos and coach-chat insights each have their own consent, recorded like the others.
begin;
select plan(3);

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'a@example.com');
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select lives_ok($$ select public.set_consent('body_photos', true, '2026-09') $$, 'body-photo consent can be given');
select lives_ok($$ select public.set_consent('coach_insights', false, '2026-09') $$, 'coach-insights consent can be declined');
select results_eq(
  $$ select consent_type::text || ':' || granted from public.consents order by consent_type::text $$,
  $$ values ('body_photos:true'), ('coach_insights:false') $$,
  'both are stored separately');

select * from finish();
rollback;
