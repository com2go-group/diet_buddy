-- Dishes logged from restaurant mode use their own food source and earn logging XP like any meal.
begin;
select plan(2);

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'a@example.com');
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select lives_ok(
  $$ insert into public.food_logs (logged_at, meal_slot, name, quantity, unit, calories, protein_g, source)
     values (now(), 'dinner', 'Chicken Caesar salad', 1, 'dish', 540, 54, 'restaurant') $$,
  'a restaurant dish can be logged');
reset role;
select is(
  (select count(*)::int from public.xp_events where user_id = '11111111-1111-1111-1111-111111111111' and reason = 'meal_logged'),
  1, 'it counts as a logged meal');

select * from finish();
rollback;
