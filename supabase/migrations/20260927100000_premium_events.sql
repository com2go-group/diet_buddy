-- Premium status comes only from the RevenueCat webhook (CLAUDE.md §12). Webhooks can arrive out
-- of order, so each change records the event time and older events are ignored.
alter table public.profiles add column premium_event_at timestamptz;

create function public.apply_premium_event(target_user uuid, premium boolean, event_at timestamptz)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
    set is_premium = premium, premium_event_at = event_at
    where user_id = target_user
      and (premium_event_at is null or premium_event_at <= event_at);
  return found;
end;
$$;

revoke execute on function public.apply_premium_event(uuid, boolean, timestamptz) from public, anon, authenticated;
