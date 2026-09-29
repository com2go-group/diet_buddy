-- European food composition data (decision log 2026-09-30, §17.5): CIQUAL (ANSES, France,
-- Licence Ouverte / Etalab 2.0) first; other national tables (NEVO, CoFID) can be added with
-- their own `source`. Loaded with scripts/foods/import-ciqual.mjs; searched by food-search next
-- to USDA. Public reference data, no user data. Service role only (read through the function).

create table public.eu_foods (
  source text not null check (source in ('ciqual', 'nevo', 'cofid')),
  code text not null check (length(code) between 1 and 40),
  name_en text not null check (length(name_en) between 1 and 300),
  -- The name in the table's own language (French for CIQUAL), and that language.
  name_local text check (length(name_local) <= 300),
  local_lang text check (local_lang in ('fr', 'nl', 'de', 'es', 'it', 'el', 'en')),
  kcal numeric(7, 2) not null check (kcal >= 0 and kcal <= 950),
  protein_g numeric(6, 2) not null default 0 check (protein_g >= 0 and protein_g <= 100),
  carbs_g numeric(6, 2) not null default 0 check (carbs_g >= 0 and carbs_g <= 100),
  fat_g numeric(6, 2) not null default 0 check (fat_g >= 0 and fat_g <= 100),
  fiber_g numeric(6, 2) not null default 0 check (fiber_g >= 0 and fiber_g <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (source, code)
);
alter table public.eu_foods enable row level security;
revoke all on public.eu_foods from anon, authenticated;
create trigger set_updated_at before update on public.eu_foods
  for each row execute function public.set_updated_at();

/**
 * Foods whose name contains every word of the query (case-insensitive), in the user's language
 * when the table has it (French CIQUAL names for French users), else in English. Shorter, earlier
 * matches first. Service role only (food-search).
 */
create function public.search_eu_foods(p_query text, p_lang text, p_limit integer)
returns table (
  source text, code text, name text, kcal numeric, protein_g numeric, carbs_g numeric,
  fat_g numeric, fiber_g numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  with words as (
    select array_agg(w) as ws
    from unnest(regexp_split_to_array(lower(trim(coalesce(p_query, ''))), '\s+')) w
    where length(w) >= 2
  ),
  named as (
    select f.*,
           case when f.local_lang = p_lang and f.name_local is not null
                then f.name_local else f.name_en end as shown
    from public.eu_foods f
  )
  select n.source, n.code, n.shown, n.kcal, n.protein_g, n.carbs_g, n.fat_g, n.fiber_g
  from named n, words
  where words.ws is not null
    and not exists (
      select 1 from unnest(words.ws) w where position(w in lower(n.shown)) = 0
    )
  order by position(words.ws[1] in lower(n.shown)), length(n.shown)
  limit greatest(0, least(p_limit, 50));
$$;
revoke all on function public.search_eu_foods(text, text, integer) from public, anon, authenticated;
