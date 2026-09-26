-- Admin dashboard: role + two-factor checks, validated settings, audit log, support, campaigns.
begin;
select plan(26);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'user@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'support@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'admin@example.com'),
  ('44444444-4444-4444-4444-444444444444', 'owner@example.com'),
  ('55555555-5555-5555-5555-555555555555', 'fan@example.com');
insert into public.admin_users (user_id, role) values
  ('22222222-2222-2222-2222-222222222222', 'support'),
  ('33333333-3333-3333-3333-333333333333', 'admin'),
  ('44444444-4444-4444-4444-444444444444', 'owner');
insert into public.consents (user_id, consent_type, granted, version) values
  ('55555555-5555-5555-5555-555555555555', 'marketing', true, '1'),
  ('11111111-1111-1111-1111-111111111111', 'marketing', false, '1');

set local role authenticated;

-- A regular user.
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal2"}';
select throws_ok($$ select public.admin_stats() $$, '42501', null, 'regular users are refused');
select is_empty($$ select * from public.admin_me() $$, 'admin_me is empty for regular users');
select throws_ok($$ select public.require_admin('support') $$, '42501', null,
  'internal helpers are not callable');
insert into public.support_tickets (subject, message) values ('Cannot log water', 'The button does nothing');
select results_eq($$ select status from public.support_tickets $$, $$ values ('open') $$,
  'users open their own tickets');
select throws_ok($$ update public.support_tickets set status = 'closed' $$, '42501', null,
  'users cannot change ticket status');
select throws_ok(
  $$ insert into public.safety_events (user_id, persona, flag) values (auth.uid(), 'aria', 'crisis') $$,
  '42501', null, 'safety events are server-written');

reset role;
create temp table ticket as select id from public.support_tickets;
grant select on ticket to authenticated;
set local role authenticated;

-- Support staff without two-factor sign-in.
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aal":"aal1"}';
select results_eq($$ select role::text, mfa_verified from public.admin_me() $$,
  $$ values ('support', false) $$, 'admin_me reports the missing second factor');
select throws_ok($$ select public.admin_stats() $$, '42501', null,
  'admin tools need a two-factor session');

-- Support staff with two-factor.
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aal":"aal2"}';
select ok((public.admin_stats() ->> 'users_total')::int = 5, 'support sees the overview');
select is((select count(*)::int from public.admin_list_users('example.com', 50, 0)), 5, 'support lists users');
select is((select count(*)::int from public.admin_list_users('fan', 50, 0)), 1, 'search by email');
select throws_ok($$ select public.admin_set_config('coach_daily_message_limit_free', '10') $$,
  '42501', null, 'support cannot change settings');
select lives_ok(
  $$ select public.admin_reply_ticket((select id from ticket), 'Fixed in 1.0.1, please update.', 'answered') $$,
  'support replies to tickets');

-- Admin.
set local request.jwt.claims to '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated","aal":"aal2"}';
select lives_ok($$ select public.admin_set_config('coach_daily_message_limit_free', '10') $$,
  'admins change limits');
select throws_ok($$ select public.admin_set_config('coach_daily_message_limit_free', '-1') $$,
  '22023', null, 'invalid values are refused');
select throws_ok($$ select public.admin_set_config('secret_backdoor', 'true') $$,
  '22023', null, 'unknown settings are refused');
select lives_ok($$ select public.admin_set_config('ai_monthly_budget_usd', 'null') $$,
  'no AI budget cap is allowed');
select throws_ok($$ select public.admin_set_config('sms_sender_id', '"Diet Buddy Ltd"') $$,
  '22023', null, 'SMS sender IDs are at most 11 characters');
select lives_ok($$ select public.admin_set_config('feature_barcode', 'false') $$,
  'feature switches can be set');
select is(public.admin_send_campaign('New recipes this week', 'Take a look in the app'), 1,
  'campaigns reach only users with marketing consent');
select lives_ok($$ select public.admin_save_faq(null, 'How do I log water?', 'Tap a glass on Home.', 1, true) $$,
  'admins write FAQ entries');
select throws_ok($$ select public.admin_set_role('11111111-1111-1111-1111-111111111111', 'admin') $$,
  '42501', null, 'only owners manage admin roles');

-- Owner.
set local request.jwt.claims to '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated","aal":"aal2"}';
select lives_ok($$ select public.admin_set_role('11111111-1111-1111-1111-111111111111', 'support') $$,
  'owners grant roles');

reset role;
select is(
  (select array_agg(action order by created_at, action) from public.admin_audit_log),
  array['reply_ticket', 'save_faq', 'send_campaign', 'set_config', 'set_config', 'set_config', 'set_role'],
  'every admin change is in the audit log');
select results_eq(
  $$ select type, title from public.notifications where user_id = '11111111-1111-1111-1111-111111111111' $$,
  $$ values ('support'::text, '💬 Reply from DietBuddy support'::text) $$,
  'the user is notified of the reply (and gets no campaign without consent)');

set local role authenticated;
set local request.jwt.claims to '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';
select is((select count(*)::int from public.faq_entries), 1, 'published FAQ entries are readable');

select * from finish();
rollback;
