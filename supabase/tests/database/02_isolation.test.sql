-- Users can only see and change their own rows.
begin;
select no_plan();

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.com');

-- ── User A creates data ──
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

insert into public.food_logs (meal_slot, name, calories, source) values ('breakfast', 'Oatmeal', 300, 'manual');
insert into public.water_logs (ml) values (250);
insert into public.body_metrics (weight_kg) values (80);
insert into public.goals (goal_types) values ('{healthy_lifestyle}');
insert into public.preferences (activity_level) values ('active');
insert into public.device_connections (platform) values ('healthkit');
insert into public.consents (consent_type, granted, version) values ('health_data', true, '1');

select is((select count(*)::int from public.profiles), 1, 'A sees exactly one profile: their own');
select is((select count(*)::int from public.food_logs), 1, 'A sees their food log');
select is((select count(*)::int from public.consent_events), 1, 'A sees their consent audit entry');

-- ── User B sees none of it ──
set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select is_empty($$ select 1 from public.food_logs $$, 'B cannot see A''s food logs');
select is_empty($$ select 1 from public.water_logs $$, 'B cannot see A''s water logs');
select is_empty($$ select 1 from public.body_metrics $$, 'B cannot see A''s body metrics');
select is_empty($$ select 1 from public.goals $$, 'B cannot see A''s goals');
select is_empty($$ select 1 from public.preferences $$, 'B cannot see A''s preferences');
select is_empty($$ select 1 from public.device_connections $$, 'B cannot see A''s devices');
select is_empty($$ select 1 from public.consents $$, 'B cannot see A''s consents');
select is_empty($$ select 1 from public.consent_events $$, 'B cannot see A''s consent history');
select is((select user_id from public.profiles), '22222222-2222-2222-2222-222222222222'::uuid,
  'B sees only their own profile');

select throws_ok(
  $$ insert into public.food_logs (user_id, meal_slot, name, calories, source)
     values ('11111111-1111-1111-1111-111111111111', 'lunch', 'Injected', 1, 'manual') $$,
  '42501', null, 'B cannot write rows owned by A');

update public.food_logs set name = 'Tampered';
delete from public.water_logs;
update public.profiles set name = 'Tampered' where user_id = '11111111-1111-1111-1111-111111111111';

-- ── Anonymous ──
set local role anon;
select throws_ok($$ select * from public.profiles $$, '42501', null, 'anon cannot read profiles');
select throws_ok($$ select * from public.food_logs $$, '42501', null, 'anon cannot read food logs');

-- ── Verify B's writes had no effect ──
reset role;
select is((select name from public.food_logs), 'Oatmeal', 'B could not update A''s food log');
select is((select count(*)::int from public.water_logs), 1, 'B could not delete A''s water log');
select is(
  (select name from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'),
  null, 'B could not rename A''s profile');

select * from finish();
rollback;
