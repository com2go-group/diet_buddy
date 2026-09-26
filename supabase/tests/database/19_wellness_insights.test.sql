-- Wellness insights: server-written, readable and deletable only by their owner, and erased when
-- the coach-insights consent is withdrawn.
begin;
select plan(8);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.com');
insert into public.consents (user_id, consent_type, granted, version) values
  ('11111111-1111-1111-1111-111111111111', 'coach_insights', true, 'v'),
  ('22222222-2222-2222-2222-222222222222', 'coach_insights', true, 'v');
insert into public.wellness_insights
  (user_id, period_start, period_end, insights, messages_analysed, model, prompt_version) values
  ('11111111-1111-1111-1111-111111111111', current_date - 13, current_date, '[{"title":"A"}]', 8, 'm', 'wellness.v1'),
  ('11111111-1111-1111-1111-111111111111', current_date - 20, current_date - 7, '[{"title":"A0"}]', 6, 'm', 'wellness.v1'),
  ('22222222-2222-2222-2222-222222222222', current_date - 13, current_date, '[{"title":"B"}]', 9, 'm', 'wellness.v1');

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select results_eq($$ select insights->0->>'title' from public.wellness_insights order by period_end $$,
  $$ values ('A0'), ('A') $$, 'users see only their own insights');
select throws_ok(
  $$ insert into public.wellness_insights (user_id, period_start, period_end, insights, messages_analysed, model, prompt_version)
     values ('11111111-1111-1111-1111-111111111111', current_date, current_date, '[]', 1, 'm', 'x') $$,
  '42501', null, 'users cannot write insights');
select throws_ok($$ update public.wellness_insights set insights = '[]' $$, '42501', null,
  'users cannot change insights');
select lives_ok($$ delete from public.wellness_insights where period_end < current_date $$,
  'users can delete their insights');
select is((select count(*)::int from public.wellness_insights), 1, 'the older set is gone');

select lives_ok($$ select public.set_consent('coach_insights', false, 'v2') $$, 'consent can be withdrawn');
select is((select count(*)::int from public.wellness_insights), 0, 'withdrawing erases the insights');

reset role;
select is((select count(*)::int from public.wellness_insights), 1, 'other users keep theirs');

select * from finish();
rollback;
