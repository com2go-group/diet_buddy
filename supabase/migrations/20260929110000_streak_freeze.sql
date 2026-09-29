-- Streak freeze: a missed day doesn't have to end a streak. Users earn one freeze for every
-- 7 days of streak (holding at most 2); when they come back after missing a single day, a freeze
-- covers it automatically. All server-side (CLAUDE.md §7.15): the app can only read the count.
alter table public.profiles
  add column streak_freezes integer not null default 0 check (streak_freezes between 0 and 2);

-- Days a freeze covered (shown in the app; they keep the streak alive but don't add to it).
create table public.streak_freezes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);
create trigger set_updated_at before update on public.streak_freezes
  for each row execute function public.set_updated_at();
alter table public.streak_freezes enable row level security;
grant select on public.streak_freezes to authenticated;
create policy "own rows: select" on public.streak_freezes for select to authenticated
  using (user_id = (select auth.uid()));

-- Streak = consecutive days with a check-in or food log, ending today or yesterday. Covered days
-- continue the run without counting. A single missed day in the last two days is covered with a
-- freeze if one is available and the run continues before it; older gaps are never filled later.
create or replace function public.refresh_streak(target_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  streak integer := 0;
  cur date := current_date;
  previous integer;
  freezes integer;
begin
  select streak_days, streak_freezes into previous, freezes
    from public.profiles where user_id = target_user for update;
  if not found then
    return;
  end if;

  if not public.has_activity_on(target_user, cur) then
    cur := cur - 1;
  end if;
  loop
    if public.has_activity_on(target_user, cur) then
      streak := streak + 1;
    elsif exists (select 1 from public.streak_freezes f where f.user_id = target_user and f.day = cur) then
      null; -- covered earlier
    elsif streak > 0 and freezes > 0 and cur >= current_date - 2
          and public.has_activity_on(target_user, cur - 1) then
      insert into public.streak_freezes (user_id, day) values (target_user, cur);
      freezes := freezes - 1;
      insert into public.notifications (user_id, type, title, body)
      values (target_user, 'streak', '🧊 Streak freeze used',
              'You missed a day, so a streak freeze kept your streak going. Keep it up!');
    else
      exit;
    end if;
    cur := cur - 1;
  end loop;

  -- One freeze for each new 7-day mark reached, holding at most 2.
  if streak > coalesce(previous, 0) and streak % 7 = 0 then
    freezes := least(freezes + 1, 2);
  end if;

  update public.profiles
    set streak_days = streak, streak_freezes = freezes
    where user_id = target_user;
end;
$$;
