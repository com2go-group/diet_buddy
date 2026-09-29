-- Free-tier AI budget funded by ads: costs include cache tokens, rewarded views top the budget
-- up (capped), boosts give no XP, and only the service role and admins can read it.
begin;
select plan(14);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'free@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'admin@example.com');
insert into public.admin_users (user_id, role) values ('22222222-2222-2222-2222-222222222222', 'admin');

select is(
  public.ai_cost_usd('claude-haiku-4-5-20251001', 1000000, 0, 0, 0,
    (select value from public.app_config where key = 'ai_prices')),
  1.0, 'dated model IDs are priced by their base model');
select is(
  public.ai_cost_usd('claude-haiku-4-5', 0, 1000000, 1000000, 1000000,
    (select value from public.app_config where key = 'ai_prices')),
  5 + 0.1 + 1.25, 'output, cache reads and cache writes are priced');
select is(
  public.ai_cost_usd('some-new-model', 1000000, 0, 0, 0, '{}'),
  2.0, 'unknown models are priced as Sonnet (conservative)');

-- 3,000 Haiku input + 1,000 output tokens = $0.008 spent today.
insert into public.ai_usage (user_id, function_name, model, input_tokens, output_tokens)
values ('11111111-1111-1111-1111-111111111111', 'coach-chat', 'claude-haiku-4-5', 3000, 1000);
insert into public.ai_usage (user_id, function_name, model, input_tokens, output_tokens, created_at)
values ('11111111-1111-1111-1111-111111111111', 'coach-chat', 'claude-haiku-4-5', 90000, 0, now() - interval '2 days');

select is(
  (public.ai_allowance('11111111-1111-1111-1111-111111111111', now() - interval '1 hour',
    to_char(now(), 'YYYY-MM-DD'), false) ->> 'spent_usd')::numeric,
  0.008, 'only today''s use counts');
select is(
  (public.ai_allowance('11111111-1111-1111-1111-111111111111', now() - interval '1 hour',
    to_char(now(), 'YYYY-MM-DD'), false) ->> 'budget_usd')::numeric,
  0.03, 'the base budget without videos');
select is(
  (public.ai_allowance('11111111-1111-1111-1111-111111111111', now() - interval '1 hour',
    to_char(now(), 'YYYY-MM-DD'), true) ->> 'budget_usd')::numeric,
  0.02, 'a smaller budget on the web build (no ads)');

-- Two boosts and a meal reveal today, one boost yesterday.
insert into public.ad_unlocks (user_id, unlock_type, target_id) values
  ('11111111-1111-1111-1111-111111111111', 'ai_boost', to_char(now(), 'YYYY-MM-DD') || ':1'),
  ('11111111-1111-1111-1111-111111111111', 'ai_boost', to_char(now(), 'YYYY-MM-DD') || ':2'),
  ('11111111-1111-1111-1111-111111111111', 'meal_plan', to_char(now(), 'YYYY-MM-DD') || ':lunch'),
  ('11111111-1111-1111-1111-111111111111', 'ai_boost', to_char(now() - interval '1 day', 'YYYY-MM-DD') || ':1');
select is(
  (public.ai_allowance('11111111-1111-1111-1111-111111111111', now() - interval '1 hour',
    to_char(now(), 'YYYY-MM-DD'), false) ->> 'boosts')::int,
  3, 'today''s rewarded videos count, meal reveals included, capped at 3');
select is(
  (public.ai_allowance('11111111-1111-1111-1111-111111111111', now() - interval '1 hour',
    to_char(now(), 'YYYY-MM-DD'), false) ->> 'budget_usd')::numeric,
  0.048, 'each counted video adds to the budget');
select is(
  (public.ai_allowance('11111111-1111-1111-1111-111111111111', now() - interval '1 hour',
    to_char(now(), 'YYYY-MM-DD'), false) #>> '{limits,coach_free}')::int,
  3, 'feature limits come from app_config');
select is((select xp from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'),
  15, 'AI boosts give no XP (only the meal reveal did)');
select throws_ok(
  $$ insert into public.ad_unlocks (user_id, unlock_type, target_id)
     values ('11111111-1111-1111-1111-111111111111', 'ai_boost', 'lots') $$,
  '23514', null, 'boost targets are "YYYY-MM-DD:n"');

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal2"}';
select throws_ok(
  $$ select public.ai_allowance('11111111-1111-1111-1111-111111111111', now(), '2026-09-29', false) $$,
  '42501', null, 'the app cannot read or fake the allowance');
select throws_ok($$ select public.admin_ai_economics(30) $$, '42501', null,
  'users cannot read the AI economics');

set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aal":"aal2"}';
select is((public.admin_ai_economics(30) ->> 'rewarded_views')::int, 4,
  'admins see rewarded views and the cost-vs-revenue estimate');

select * from finish();
rollback;
