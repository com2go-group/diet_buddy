-- Grocery AI (CLAUDE.md §7.10, Premium): one shopping list per user per week start, built by the
-- generate-grocery-list Edge Function from the stored meal plans. Users can only tick items off.

create table public.grocery_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  start_date date not null,
  days smallint not null check (days between 1 and 7),
  items jsonb not null,
  estimated_cost numeric(8, 2),
  currency text not null default 'EUR' check (char_length(currency) = 3),
  checked text[] not null default '{}' check (cardinality(checked) <= 200),
  model text not null,
  prompt_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, start_date)
);
create trigger set_updated_at before update on public.grocery_lists
  for each row execute function public.set_updated_at();

alter table public.grocery_lists enable row level security;
grant select, update (checked) on public.grocery_lists to authenticated;
create policy "own rows: select" on public.grocery_lists for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own rows: update" on public.grocery_lists for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
