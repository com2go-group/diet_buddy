-- Goal reached: users record it on their own goal only.
begin;
select plan(2);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.com');
insert into public.goals (user_id, goal_types, goal_weight_kg)
values ('11111111-1111-1111-1111-111111111111', '{lose_fat}', 70),
       ('22222222-2222-2222-2222-222222222222', '{lose_fat}', 60);

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
update public.goals set reached_at = now(), goal_types = '{healthy_lifestyle}', pace = null;
select isnt((select reached_at from public.goals), null, 'the user records reaching their goal');
reset role;
select is(
  (select reached_at from public.goals where user_id = '22222222-2222-2222-2222-222222222222'),
  null, 'other users'' goals are untouched');

select * from finish();
rollback;
