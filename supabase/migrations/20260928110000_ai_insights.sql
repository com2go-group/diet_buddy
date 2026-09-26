-- AI-written insights (CLAUDE.md §7.8, Phase 3): one set per user per day, written only by the
-- generate-insights Edge Function (service role) from aggregated numbers. Users can read their own.

create table public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  insights jsonb not null,
  model text not null,
  prompt_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);
create trigger set_updated_at before update on public.ai_insights
  for each row execute function public.set_updated_at();

alter table public.ai_insights enable row level security;
grant select on public.ai_insights to authenticated;
create policy "own rows: select" on public.ai_insights for select to authenticated
  using (user_id = (select auth.uid()));
