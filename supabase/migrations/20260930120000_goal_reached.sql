-- Goal reached → maintenance (decision log 2026-09-30): when the user's trend weight reaches
-- the goal and they switch to maintenance, the goal keeps its weight as the weight to maintain
-- and records when it was reached. Users already have update rights on their own goals.
alter table public.goals add column reached_at timestamptz;
