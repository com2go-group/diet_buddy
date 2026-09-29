-- Favourite foods are private, unique per food and limited in size and number.
begin;
select plan(7);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.com');

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select lives_ok(
  $$ insert into public.favorite_foods (name, food_ref, food)
     values ('Oats', 'usda:1', '{"kind":"per100g","name":"Oats"}') $$,
  'a user can star a food');
select throws_ok(
  $$ insert into public.favorite_foods (name, food_ref, food)
     values ('Oats again', 'usda:1', '{"kind":"per100g"}') $$,
  '23505', null, 'the same food can only be starred once');
select throws_ok(
  $$ insert into public.favorite_foods (name, food)
     values ('Huge', jsonb_build_object('x', repeat('a', 5000))) $$,
  '23514', null, 'oversized food data is rejected');
select throws_ok(
  $$ update public.favorite_foods set name = 'Changed' $$,
  '42501', null, 'favourites cannot be edited, only starred and unstarred');

set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select is((select count(*)::int from public.favorite_foods), 0, 'other users see none');
select throws_ok(
  $$ insert into public.favorite_foods (user_id, name, food)
     values ('11111111-1111-1111-1111-111111111111', 'Sneaky', '{}') $$,
  '42501', null, 'nobody can add to another user''s favourites');

reset role;
insert into public.favorite_foods (user_id, name, food)
  select '22222222-2222-2222-2222-222222222222', 'Food ' || i, '{}' from generate_series(1, 100) i;
select throws_ok(
  $$ insert into public.favorite_foods (user_id, name, food)
     values ('22222222-2222-2222-2222-222222222222', 'One more', '{}') $$,
  'P0001', 'favourite limit reached', 'at most 100 favourites');

select * from finish();
rollback;
