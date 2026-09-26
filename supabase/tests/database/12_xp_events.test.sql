-- XP for logging: once per meal per day and once per day for the water goal; can't be farmed.
begin;
select plan(7);

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'a@example.com');
insert into public.plans (user_id, version, daily_calories, protein_g, carbs_g, fat_g, fiber_g, water_ml)
  values ('11111111-1111-1111-1111-111111111111', 1, 2000, 150, 200, 67, 28, 1000);

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
insert into public.food_logs (meal_slot, name, calories, source) values ('breakfast', 'Oats', 300, 'manual');
insert into public.food_logs (meal_slot, name, calories, source) values ('breakfast', 'Berries', 50, 'manual');
reset role;
select is((select count(*)::integer from public.xp_events where reason = 'meal_logged'), 1,
  'two items in one meal earn the meal XP once');

set local role authenticated;
delete from public.food_logs;
insert into public.food_logs (meal_slot, name, calories, source) values ('breakfast', 'Oats', 300, 'manual');
insert into public.food_logs (meal_slot, name, calories, source) values ('lunch', 'Salad', 400, 'manual');
reset role;
select is((select count(*)::integer from public.xp_events where reason = 'meal_logged'), 2,
  'deleting and re-logging breakfast earns nothing new; lunch does');

set local role authenticated;
insert into public.water_logs (ml) values (500);
reset role;
select is((select count(*)::integer from public.xp_events where reason = 'water_goal'), 0, 'no water XP before the goal');
set local role authenticated;
insert into public.water_logs (ml) values (500);
insert into public.water_logs (ml) values (250);
reset role;
select is((select count(*)::integer from public.xp_events where reason = 'water_goal'), 1, 'reaching the goal earns XP once');
select is((select xp from public.profiles where user_id = '11111111-1111-1111-1111-111111111111'),
  5 + 5 + 10 + 10 + 20, '2 meals + water goal + First Bite + Hydrated');

set local role authenticated;
select throws_ok($$ insert into public.xp_events (user_id, reason, ref, amount)
  values ('11111111-1111-1111-1111-111111111111', 'x', 'y', 1000) $$, '42501', null, 'users cannot write XP events');
select throws_ok($$ select public.grant_xp_once('11111111-1111-1111-1111-111111111111', 'x', 'y', 1000) $$,
  '42501', null, 'users cannot call the XP function');

select * from finish();
rollback;
