-- AI insights are server-written and readable only by their owner.
begin;
select plan(6);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.com');
insert into public.ai_insights (user_id, day, insights, model, prompt_version) values
  ('11111111-1111-1111-1111-111111111111', current_date, '[{"title":"A"}]', 'm', 'insights.v1'),
  ('22222222-2222-2222-2222-222222222222', current_date, '[{"title":"B"}]', 'm', 'insights.v1');

select throws_ok(
  $$ insert into public.ai_insights (user_id, day, insights, model, prompt_version)
     values ('11111111-1111-1111-1111-111111111111', current_date, '[]', 'm', 'v') $$,
  '23505', null, 'one set of insights per user per day');

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select results_eq($$ select insights->0->>'title' from public.ai_insights $$, $$ values ('A') $$,
  'users read only their own insights');
select throws_ok(
  $$ insert into public.ai_insights (user_id, day, insights, model, prompt_version)
     values ('11111111-1111-1111-1111-111111111111', current_date - 1, '[]', 'm', 'v') $$,
  '42501', null, 'users cannot write insights');
select throws_ok($$ update public.ai_insights set insights = '[]' $$, '42501', null,
  'users cannot edit insights');
select throws_ok($$ delete from public.ai_insights $$, '42501', null,
  'users cannot delete insights');

reset role;
delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
select is((select count(*)::int from public.ai_insights), 1, 'insights are deleted with the account');

select * from finish();
rollback;
