-- Coach tips (CLAUDE.md §7.13): a daily evening tip from a coach persona, worked out on the
-- device from the day's own numbers and scheduled as a local notification. On by default,
-- switchable in Profile → Notifications.
alter table public.notification_preferences
  add column coach_tips boolean not null default true;
grant update (coach_tips) on public.notification_preferences to authenticated;
