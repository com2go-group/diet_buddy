-- Push notifications (CLAUDE.md §7.13): device tokens, per-user preferences, and server-created
-- notifications (achievements, streak milestones, weekly report) that push-dispatch sends.

-- ─── push_tokens ─────────────────────────────────────────────────────────────
create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  token text not null unique check (char_length(token) <= 200),
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index push_tokens_user on public.push_tokens (user_id);
create trigger set_updated_at before update on public.push_tokens
  for each row execute function public.set_updated_at();

alter table public.push_tokens enable row level security;
grant select, insert, update (platform, updated_at), delete on public.push_tokens to authenticated;
create policy "own rows: select" on public.push_tokens for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own rows: insert" on public.push_tokens for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "own rows: update" on public.push_tokens for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows: delete" on public.push_tokens for delete to authenticated
  using (user_id = (select auth.uid()));

-- ─── notification_preferences ────────────────────────────────────────────────
-- Local reminders (meals, check-in) are scheduled on the device from these flags; the rest are
-- pushed by the server. Promotional pushes also need marketing consent.
create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  meal_reminders boolean not null default true,
  checkin_reminder boolean not null default true,
  streaks boolean not null default true,
  achievements boolean not null default true,
  weekly_report boolean not null default true,
  promotions boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.notification_preferences
  for each row execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;
grant select, insert, update (meal_reminders, checkin_reminder, streaks, achievements, weekly_report, promotions)
  on public.notification_preferences to authenticated;
create policy "own rows: select" on public.notification_preferences for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own rows: insert" on public.notification_preferences for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "own rows: update" on public.notification_preferences for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ─── notifications: push bookkeeping ─────────────────────────────────────────
alter table public.notifications add column pushed_at timestamptz;
create index notifications_unpushed on public.notifications (created_at) where pushed_at is null;

-- ─── Streak milestones ───────────────────────────────────────────────────────
create function public.on_streak_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.streak_days > old.streak_days and new.streak_days in (3, 7, 14, 30, 60, 100, 365) then
    insert into public.notifications (user_id, type, title, body)
    values (new.user_id, 'streak',
            format('🔥 %s-day streak!', new.streak_days),
            'Keep it going — log a meal or check in today.');
  end if;
  return new;
end;
$$;

create trigger on_streak_changed
  after update of streak_days on public.profiles
  for each row execute function public.on_streak_changed();

-- ─── Weekly progress report ──────────────────────────────────────────────────
-- Run weekly by pg_cron (docs/setup/push.md). One notification per user with activity that week.
create function public.create_weekly_reports()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  created integer;
begin
  insert into public.notifications (user_id, type, title, body)
  select a.user_id, 'weekly_report', '📊 Your week in DietBuddy',
         format('You logged food on %s of the last 7 days%s. Tap to see your progress.',
                a.days,
                case when w.change is null then ''
                     when w.change < 0 then format(' and your weight is down %s kg', abs(w.change))
                     when w.change > 0 then format(' and your weight is up %s kg', w.change)
                     else ' and your weight held steady' end)
  from (
    select f.user_id, count(distinct f.logged_at::date) as days
    from public.food_logs f
    where f.logged_at >= now() - interval '7 days'
    group by f.user_id
  ) a
  left join lateral (
    select round((
      (select m.weight_kg from public.body_metrics m where m.user_id = a.user_id and m.weight_kg is not null
         and m.measured_at >= now() - interval '7 days' order by m.measured_at desc limit 1)
      - (select m.weight_kg from public.body_metrics m where m.user_id = a.user_id and m.weight_kg is not null
         and m.measured_at >= now() - interval '7 days' order by m.measured_at asc limit 1)
    ), 1) as change
  ) w on true;
  get diagnostics created = row_count;
  return created;
end;
$$;

revoke execute on function public.on_streak_changed() from public, anon, authenticated;
revoke execute on function public.create_weekly_reports() from public, anon, authenticated;

-- A device token belongs to whoever is signed in on that device now. Moving it from a previous
-- account needs to touch another user's row, so it's done here rather than through RLS.
create function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  delete from public.push_tokens where token = p_token and user_id <> auth.uid();
  insert into public.push_tokens (user_id, token, platform)
  values (auth.uid(), p_token, p_platform)
  on conflict (token) do update set platform = excluded.platform, updated_at = now();
end;
$$;

revoke execute on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;
