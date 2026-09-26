-- Reference data. Runs after migrations on `supabase db reset`; safe to re-run.

-- Copy and XP follow prototype/src/app/components/ProgressScreen.tsx. "Clean Eater" says
-- "within" instead of the prototype's "under" so the app never rewards undereating (CLAUDE.md §9).
insert into public.achievements (code, title, description, emoji, xp_reward) values
  ('streak_12', '12 Day Streak', 'Logged every day for 12 days', '🔥', 120),
  ('clean_eater', 'Clean Eater', '5 days within your calorie target', '🥗', 80),
  ('hydration_hero', 'Hydration Hero', 'Hit water goal 7 days in a row', '💧', 70),
  ('protein_pro', 'Protein Pro', 'Hit protein target 10 days', '💪', 100),
  ('scale_master', 'Scale Master', 'Lost 2kg toward goal', '⚖️', 150),
  ('two_week_warrior', 'Two Week Warrior', 'Log for 14 consecutive days', '🏆', 200),
  ('first_log', 'First Bite', 'Log your first meal', '🍽️', 10),
  ('hydration_starter', 'Hydrated', 'Hit your water goal for the first time', '🥤', 20),
  ('check_in_7', 'Check-In Champ', 'Complete 7 daily check-ins', '✅', 50),
  ('plan_follower', 'Plan Follower', 'Log 10 items from your AI meal plan', '📋', 60),
  ('streak_30', '30 Day Streak', 'Log every day for 30 days', '🌟', 300)
on conflict (code) do update
  set title = excluded.title, description = excluded.description,
      emoji = excluded.emoji, xp_reward = excluded.xp_reward;

insert into public.app_config (key, value, description) values
  ('coach_daily_message_limit_free', '5', 'Coach messages per day on the free tier (decision log 2026-09-25)')
on conflict (key) do nothing;
