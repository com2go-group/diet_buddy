-- Premium given by admins: the user detail lists the grants from the audit log, newest first.
begin;
select plan(5);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'user@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'support@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'admin@example.com');
insert into public.admin_users (user_id, role) values
  ('22222222-2222-2222-2222-222222222222', 'support'),
  ('33333333-3333-3333-3333-333333333333', 'admin');
-- What admin-users writes (service role) after RevenueCat has answered.
insert into public.admin_audit_log (admin_id, action, target, details, created_at) values
  ('33333333-3333-3333-3333-333333333333', 'grant_premium', '11111111-1111-1111-1111-111111111111',
   '{"duration":"monthly","reason":"Beta tester","premium":true,"expires_at":"2026-10-29T10:00:00Z"}',
   now() - interval '2 days'),
  ('33333333-3333-3333-3333-333333333333', 'revoke_premium', '11111111-1111-1111-1111-111111111111',
   '{"reason":"Test finished","premium":false,"expires_at":null}', now() - interval '1 day'),
  ('33333333-3333-3333-3333-333333333333', 'user_ban', '11111111-1111-1111-1111-111111111111', '{}',
   now()),
  ('33333333-3333-3333-3333-333333333333', 'grant_premium', '22222222-2222-2222-2222-222222222222',
   '{"duration":"weekly","reason":"Someone else"}', now());

set local role authenticated;
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aal":"aal2"}';
select is(
  jsonb_array_length(public.admin_user_detail('11111111-1111-1111-1111-111111111111') -> 'premium_grants'),
  2, 'only this user''s Premium grants and revokes are listed');
select is(
  public.admin_user_detail('11111111-1111-1111-1111-111111111111') #>> '{premium_grants,0,action}',
  'revoke_premium', 'newest first');
select is(
  public.admin_user_detail('11111111-1111-1111-1111-111111111111') #>> '{premium_grants,1,details,reason}',
  'Beta tester', 'with the reason');
select is(
  public.admin_user_detail('11111111-1111-1111-1111-111111111111') #>> '{premium_grants,1,admin_email}',
  'admin@example.com', 'and who gave it');

set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal2"}';
select throws_ok(
  $$ select public.admin_user_detail('11111111-1111-1111-1111-111111111111') $$,
  '42501', null, 'users cannot read the grant history');

select * from finish();
rollback;
