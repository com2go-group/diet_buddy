-- Favourite foods (Log Food → Favourites): a user's starred foods with the portion data they
-- were logged with, so they can be logged again in two taps. Own rows only; numbers come from
-- the nutrition database the food was found in (USDA / Open Food Facts) or the user's own entry.
create table public.favorite_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  food_ref text check (food_ref is null or char_length(food_ref) <= 100),
  -- The food as the app's portion picker needs it (per 100 g or per logged portion).
  food jsonb not null check (jsonb_typeof(food) = 'object' and octet_length(food::text) <= 4000),
  food_key text generated always as (coalesce(food_ref, lower(name))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, food_key)
);
create trigger set_updated_at before update on public.favorite_foods
  for each row execute function public.set_updated_at();

-- At most 100 favourites per user.
create function public.limit_favorite_foods()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.favorite_foods where user_id = new.user_id) >= 100 then
    raise exception 'favourite limit reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger limit_favorite_foods before insert on public.favorite_foods
  for each row execute function public.limit_favorite_foods();

alter table public.favorite_foods enable row level security;
grant select, insert, delete on public.favorite_foods to authenticated;
create policy "own rows: select" on public.favorite_foods for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own rows: insert" on public.favorite_foods for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "own rows: delete" on public.favorite_foods for delete to authenticated
  using (user_id = (select auth.uid()));
