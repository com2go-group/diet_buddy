-- Schema-wide invariants: every table has RLS, anon has no access, privileged functions are locked.
begin;
select no_plan();

select tables_are('public', array[
  'profiles', 'goals', 'preferences', 'body_metrics', 'plans', 'meal_plans', 'food_logs',
  'water_logs', 'checkins', 'progress_photos', 'coach_conversations', 'coach_messages',
  'achievements', 'user_achievements', 'ad_unlocks', 'notifications', 'device_connections',
  'consents', 'consent_events', 'app_config', 'ai_usage', 'push_tokens', 'notification_preferences', 'xp_events', 'ai_insights', 'grocery_lists'
]);

select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  0, 'every public table has row level security enabled');

select is(
  (select count(*)::int from information_schema.role_table_grants
   where grantee = 'anon' and table_schema = 'public'),
  0, 'anon has no privileges on any public table');

select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prosecdef
     and not coalesce(array_to_string(p.proconfig, ','), '') like '%search_path=%'),
  0, 'every security definer function pins search_path');

select ok(not has_function_privilege('authenticated', 'public.award_xp(uuid, integer)', 'execute'),
  'the app cannot award itself XP');
select ok(not has_function_privilege('authenticated', 'public.refresh_streak(uuid)', 'execute'),
  'the app cannot recompute streaks');
select ok(has_function_privilege('authenticated', 'public.bmi(numeric, numeric)', 'execute'),
  'bmi() is callable by the app');

select is((select count(*)::int from public.achievements), 11, 'eleven achievements are seeded');
select is((select value from public.app_config where key = 'coach_daily_message_limit_free'),
  '5'::jsonb, 'free-tier coach limit is 5 messages per day');

select * from finish();
rollback;
