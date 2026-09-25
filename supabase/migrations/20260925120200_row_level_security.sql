-- Row level security and table privileges.
--
-- Privileges are explicit per table (not Supabase's default "all to anon/authenticated"), so
-- server-owned columns and tables can't be written from the app even by the row's owner.
-- RLS then limits every statement to the caller's own rows. The service role (Edge Functions)
-- bypasses RLS.

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'goals', 'preferences', 'body_metrics', 'plans', 'meal_plans', 'food_logs',
    'water_logs', 'checkins', 'progress_photos', 'coach_conversations', 'coach_messages',
    'achievements', 'user_achievements', 'ad_unlocks', 'notifications', 'device_connections',
    'consents', 'consent_events', 'app_config', 'ai_usage'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end;
$$;

-- Owner-only policies for the given commands.
create function pg_temp.own_rows(tbl text, commands text[])
returns void
language plpgsql
as $$
declare
  cmd text;
begin
  foreach cmd in array commands loop
    if cmd = 'insert' then
      execute format(
        'create policy "own rows: insert" on public.%I for insert to authenticated
           with check (user_id = (select auth.uid()))', tbl);
    elsif cmd = 'update' then
      execute format(
        'create policy "own rows: update" on public.%I for update to authenticated
           using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', tbl);
    else
      execute format(
        'create policy "own rows: %s" on public.%I for %s to authenticated
           using (user_id = (select auth.uid()))', cmd, tbl, cmd);
    end if;
  end loop;
end;
$$;

-- ─── Fully user-managed ─────────────────────────────────────────────────────
grant select, insert, update, delete on public.goals, public.body_metrics, public.food_logs,
  public.water_logs, public.device_connections to authenticated;
select pg_temp.own_rows(t, array['select', 'insert', 'update', 'delete'])
from unnest(array['goals', 'body_metrics', 'food_logs', 'water_logs', 'device_connections']) t;

grant select, insert, update on public.preferences to authenticated;
select pg_temp.own_rows('preferences', array['select', 'insert', 'update']);

-- ─── Profiles: premium, XP and streak are server-owned (CLAUDE.md §7.15, §12) ─
grant select on public.profiles to authenticated;
grant update (name, birth_date, gender, height_cm, units, onboarding_step, onboarding_completed_at)
  on public.profiles to authenticated;
select pg_temp.own_rows('profiles', array['select', 'update']);

-- ─── Plans are immutable versions ───────────────────────────────────────────
grant select, insert on public.plans to authenticated;
select pg_temp.own_rows('plans', array['select', 'insert']);

-- ─── Check-ins: XP is awarded on insert, so the date can't be changed later ─
grant select, insert on public.checkins to authenticated;
grant update (mood, energy, sleep_hours, hunger, weight_kg) on public.checkins to authenticated;
select pg_temp.own_rows('checkins', array['select', 'insert', 'update']);

-- ─── Progress photos ────────────────────────────────────────────────────────
grant select, insert, delete on public.progress_photos to authenticated;
select pg_temp.own_rows('progress_photos', array['select', 'insert', 'delete']);

-- ─── Consents: current state is user-set; the audit trail is written by trigger ─
grant select, insert on public.consents to authenticated;
grant update (granted, version) on public.consents to authenticated;
select pg_temp.own_rows('consents', array['select', 'insert', 'update']);

grant select on public.consent_events to authenticated;
select pg_temp.own_rows('consent_events', array['select']);

-- ─── Notifications: users can mark read and dismiss ────────────────────────
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
select pg_temp.own_rows('notifications', array['select', 'update', 'delete']);

-- ─── Coach: written by coach-chat; users can read and delete their history ──
grant select, delete on public.coach_conversations to authenticated;
select pg_temp.own_rows('coach_conversations', array['select', 'delete']);

grant select on public.coach_messages to authenticated;
select pg_temp.own_rows('coach_messages', array['select']);

-- ─── Read-only, server-written ─────────────────────────────────────────────
grant select on public.meal_plans, public.user_achievements, public.ad_unlocks to authenticated;
select pg_temp.own_rows(t, array['select'])
from unnest(array['meal_plans', 'user_achievements', 'ad_unlocks']) t;

-- ─── Shared catalogues ─────────────────────────────────────────────────────
grant select on public.achievements, public.app_config to authenticated;
create policy "catalogue: read" on public.achievements for select to authenticated using (true);
create policy "config: read" on public.app_config for select to authenticated using (true);

-- ai_usage: RLS on, no policies, no grants → service role only.
