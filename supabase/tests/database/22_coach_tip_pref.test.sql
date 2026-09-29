-- The coach-tip switch is the user's own setting.
begin;
select plan(2);

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'a@example.com');
set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

insert into public.notification_preferences (meal_reminders) values (true);
select is((select coach_tips from public.notification_preferences), true, 'coach tips are on by default');
update public.notification_preferences set coach_tips = false;
select is((select coach_tips from public.notification_preferences), false, 'users can switch them off');

select * from finish();
rollback;
