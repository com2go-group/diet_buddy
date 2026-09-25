-- Progress photos: private bucket, owner-only folders.
begin;
select no_plan();

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.com');

select is((select public from storage.buckets where id = 'progress-photos'), false,
  'the progress-photos bucket is private');

set local role authenticated;
set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values ('progress-photos', '11111111-1111-1111-1111-111111111111/front.jpg', auth.uid()) $$,
  'users can upload into their own folder');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values ('progress-photos', '22222222-2222-2222-2222-222222222222/front.jpg', auth.uid()) $$,
  '42501', null, 'users cannot upload into someone else''s folder');

set local request.jwt.claims to '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';
select is_empty($$ select 1 from storage.objects where bucket_id = 'progress-photos' $$,
  'users cannot see other people''s photos');
delete from storage.objects;

set local request.jwt.claims to '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select is((select count(*)::int from storage.objects), 1,
  'another user''s delete had no effect; the owner still sees their photo');

select * from finish();
rollback;
