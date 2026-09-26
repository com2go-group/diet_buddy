-- Wellness Insights hub (Phase 4, decision log 2026-09-28): themes drawn from the user's own coach
-- messages, only with the separate, optional `coach_insights` consent (GDPR Art. 9). Written only
-- by the generate-wellness-insights Edge Function (service role); users can read and delete theirs.
-- Only the insight text is stored, never quotes or the messages themselves.

create table public.wellness_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  insights jsonb not null,
  messages_analysed integer not null check (messages_analysed >= 0),
  model text not null,
  prompt_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period_end),
  check (period_start <= period_end)
);
create index wellness_insights_user on public.wellness_insights (user_id, period_end desc);
create trigger set_updated_at before update on public.wellness_insights
  for each row execute function public.set_updated_at();

alter table public.wellness_insights enable row level security;
grant select, delete on public.wellness_insights to authenticated;
create policy "own rows: select" on public.wellness_insights for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own rows: delete" on public.wellness_insights for delete to authenticated
  using (user_id = (select auth.uid()));

-- Withdrawing the consent stops the processing and erases what it produced.
create function public.erase_wellness_on_withdrawal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.consent_type = 'coach_insights' and not new.granted then
    delete from public.wellness_insights where user_id = new.user_id;
  end if;
  return new;
end;
$$;
revoke execute on function public.erase_wellness_on_withdrawal() from public, anon, authenticated;

create trigger erase_wellness_on_withdrawal after insert or update of granted on public.consents
  for each row execute function public.erase_wellness_on_withdrawal();
