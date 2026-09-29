-- Abuse limits and retention: fixed-window counters, the nightly purge (old data only, the
-- health log kept), the lower free AI budget and admin validation of the new settings.
begin;
select plan(14);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'user@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'admin@example.com');
insert into public.admin_users (user_id, role) values ('22222222-2222-2222-2222-222222222222', 'admin');

select ok(public.rate_limit_hit('t:1', 60, 2), 'first hit allowed');
select ok(public.rate_limit_hit('t:1', 60, 2), 'second hit allowed');
select ok(not public.rate_limit_hit('t:1', 60, 2), 'third hit over the cap');
select ok(public.rate_limit_hit('t:2', 60, 2), 'other keys count separately');

-- Old and recent rows.
insert into public.coach_conversations (id, user_id, persona, created_at)
values ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'aria', now() - interval '3 years'),
       ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'max', now());
insert into public.coach_messages (conversation_id, user_id, persona, role, content, created_at)
values ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'aria', 'user', 'old', now() - interval '3 years'),
       ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'max', 'user', 'new', now());
insert into public.notifications (user_id, type, title, created_at)
values ('11111111-1111-1111-1111-111111111111', 'achievement', 'old', now() - interval '1 year'),
       ('11111111-1111-1111-1111-111111111111', 'achievement', 'new', now());
insert into public.food_logs (user_id, logged_at, meal_slot, name, calories, source)
values ('11111111-1111-1111-1111-111111111111', now() - interval '5 years', 'lunch', 'Soup', 300, 'manual');
insert into public.rate_limits (key, window_seconds, window_start, hits)
values ('old', 60, now() - interval '30 days', 1);

select lives_ok($$ select public.purge_old_data() $$, 'the purge runs');
select is((select array_agg(content) from public.coach_messages), array['new'],
  'coach messages past 24 months are deleted');
select is((select count(*)::int from public.coach_conversations), 1,
  'emptied old conversations go too');
select is((select count(*)::int from public.notifications where title = 'old'), 0,
  'notifications past 6 months are deleted');
select is((select count(*)::int from public.food_logs), 1, 'the food log is kept');
select is((select count(*)::int from public.rate_limits where key = 'old'), 0,
  'old counters are cleaned up');

select is((select value from public.app_config where key = 'ai_free_daily_budget_usd'), '0.03'::jsonb,
  'the free AI budget is $0.03 a day');

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select throws_ok($$ select public.rate_limit_hit('x', 60, 1) $$, '42501', null,
  'the app cannot touch the counters');

set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aal":"aal2"}';
select lives_ok(
  $$ select public.admin_set_config('sms_guard', '{"allowed_prefixes":["49"],"per_number_hour":2,"per_number_day":4,"global_hour":10,"global_day":50}') $$,
  'admins can change the SMS guard');
select throws_ok(
  $$ select public.admin_set_config('data_retention', '{"coach_messages_months":0}') $$,
  '22023', null, 'retention periods must be at least a month');

select * from finish();
rollback;
