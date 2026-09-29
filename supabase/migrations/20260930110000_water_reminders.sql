-- Water reminders (decision log 2026-09-30): a device-side nudge when the day's water is behind;
-- the switch lives with the other reminder preferences.
alter table public.notification_preferences
  add column water_reminders boolean not null default true;
grant update (water_reminders) on public.notification_preferences to authenticated;
