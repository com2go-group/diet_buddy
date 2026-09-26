-- Check-ins carry the user's local date (so "today" matches the phone), but a user may only
-- check in for today: allow the server date ±1 day to cover every time zone (UTC−12…UTC+14).
-- Without this, back- or future-dated rows would farm the +20 XP per check-in (CLAUDE.md §7.15).
-- The rule applies to app users only; server-side code (service role, migrations) is trusted.
create function public.guard_checkin_date()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated'
     and new.date not between current_date - 1 and current_date + 1 then
    raise exception 'check-in date must be today'
      using errcode = '22023', hint = 'Send the device''s local date.';
  end if;
  return new;
end;
$$;

create trigger guard_checkin_date
  before insert on public.checkins
  for each row execute function public.guard_checkin_date();
