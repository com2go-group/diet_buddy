-- Meal-plan ad unlocks are per meal (decision log 2026-09-28): target_id is "YYYY-MM-DD:slot"
-- and each unlock awards +15 XP (up to 4 a day), so ads can't be farmed for XP.

create or replace function public.on_ad_unlocked()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.award_xp(new.user_id, case new.unlock_type when 'meal_plan' then 15 else 100 end);
  return new;
end;
$$;

alter table public.ad_unlocks
  add constraint ad_unlocks_meal_target check (
    unlock_type <> 'meal_plan'
    or target_id ~ '^\d{4}-\d{2}-\d{2}:(breakfast|lunch|snack|dinner)$'
  ) not valid;
