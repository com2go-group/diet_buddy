import { addDays, dayKey, startOfDay } from '@/lib/dates';
import { optional, supabase } from '@/lib/supabase';

import { loadTwin, type TwinData } from '../twin/api';
import { STORY_DAYS, type StoryInput } from './story';

export interface StoryData {
  twin: TwinData;
  input: StoryInput;
}

/** Everything the weekly story needs, for the 7 local days ending `now`. */
export async function loadStory(userId: string, now: Date): Promise<StoryData> {
  const since = addDays(startOfDay(now), -(STORY_DAYS - 1));
  const [twin, profile, plans, food, water, checkins, unlocked, catalogue] = await Promise.all([
    loadTwin(userId),
    supabase.from('profiles').select('streak_days, xp').eq('user_id', userId).single(),
    supabase
      .from('plans')
      .select('daily_calories, protein_g, water_ml')
      .eq('user_id', userId)
      .order('version', { ascending: false })
      .limit(1),
    supabase
      .from('food_logs')
      .select('logged_at, calories, protein_g')
      .eq('user_id', userId)
      .gte('logged_at', since.toISOString()),
    supabase
      .from('water_logs')
      .select('logged_at, ml')
      .eq('user_id', userId)
      .gte('logged_at', since.toISOString()),
    supabase.from('checkins').select('date').eq('user_id', userId).gte('date', dayKey(since)),
    supabase
      .from('user_achievements')
      .select('achievement_id, unlocked_at')
      .eq('user_id', userId)
      .gte('unlocked_at', since.toISOString()),
    supabase.from('achievements').select('id, title, emoji'),
  ]);
  const p = optional(profile);
  const plan = optional(plans)?.[0];
  const byId = new Map((optional(catalogue) ?? []).map((a) => [a.id, a]));
  return {
    twin,
    input: {
      now,
      targets: plan
        ? { calories: plan.daily_calories, proteinG: plan.protein_g, waterMl: plan.water_ml }
        : null,
      food: (optional(food) ?? []).map((f) => ({
        logged_at: f.logged_at,
        calories: Number(f.calories),
        protein_g: Number(f.protein_g),
      })),
      water: optional(water) ?? [],
      checkins: optional(checkins) ?? [],
      weights: twin.metrics,
      badges: (optional(unlocked) ?? []).flatMap((u) => {
        const a = byId.get(u.achievement_id);
        return a ? [{ title: a.title, emoji: a.emoji, unlockedAt: u.unlocked_at }] : [];
      }),
      streakDays: p?.streak_days ?? 0,
      xp: p?.xp ?? 0,
    },
  };
}
