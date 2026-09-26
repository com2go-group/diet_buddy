-- Grocery lists are server-written; users read their own and can only tick items.
begin;
select plan(7);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.com');
insert into public.grocery_lists (user_id, start_date, days, items, estimated_cost, model, prompt_version) values
  ('11111111-1111-1111-1111-111111111111', current_date, 7, '[{"id":"usda:1"}]', 42.5, 'm', 'grocery.v1'),
  ('22222222-2222-2222-2222-222222222222', current_date, 7, '[{"id":"usda:2"}]', 30, 'm', 'grocery.v1');

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select results_eq($$ select items->0->>'id' from public.grocery_lists $$, $$ values ('usda:1') $$,
  'users read only their own list');
update public.grocery_lists set checked = '{usda:1}';
select results_eq($$ select checked from public.grocery_lists $$, $$ values ('{usda:1}'::text[]) $$,
  'users can tick items');
select throws_ok($$ update public.grocery_lists set estimated_cost = 1 $$, '42501', null,
  'users cannot change the list itself');
select throws_ok(
  $$ insert into public.grocery_lists (user_id, start_date, days, items, model, prompt_version)
     values ('11111111-1111-1111-1111-111111111111', current_date + 7, 7, '[]', 'm', 'v') $$,
  '42501', null, 'users cannot create lists');
select throws_ok($$ delete from public.grocery_lists $$, '42501', null, 'users cannot delete lists');

reset role;
select is((select checked from public.grocery_lists where user_id = '22222222-2222-2222-2222-222222222222'),
  '{}'::text[], 'the other user''s list is untouched');
delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
select is((select count(*)::int from public.grocery_lists), 1, 'lists are deleted with the account');

select * from finish();
rollback;
