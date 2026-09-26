import { addDays, dayKey, startOfDay } from '@/lib/dates';
import { optional, required, supabase, type Enums, type Tables } from '@/lib/supabase';

import type { CheckinRow, FoodRow, MetricRow, WaterRow } from './stats';

export interface AchievementView {
  code: string;
  title: string;
  description: string;
  emoji: string | null;
  xp: number;
  unlockedAt: string | null;
  current: number;
  target: number;
}

export interface ProgressData {
  profile: Pick<Tables<'profiles'>, 'streak_days' | 'xp' | 'units'>;
  plan: {
    dailyCalories: number;
    proteinG: number;
    waterMl: number;
    weeklyChangeKg: number | null;
  } | null;
  goal: { startKg: number | null; goalKg: number | null; types: Enums<'goal_type'>[] } | null;
  metrics: MetricRow[];
  food: FoodRow[];
  water: WaterRow[];
  checkins: CheckinRow[];
  achievements: AchievementView[];
}

export async function loadProgress(userId: string, now: Date): Promise<ProgressData> {
  const since = addDays(startOfDay(now), -30);
  const [profile, plans, goals, metrics, food, water, checkins, catalogue, unlocked, progress] =
    await Promise.all([
      supabase.from('profiles').select('streak_days, xp, units').eq('user_id', userId).single(),
      supabase
        .from('plans')
        .select('daily_calories, protein_g, water_ml, forecast')
        .eq('user_id', userId)
        .order('version', { ascending: false })
        .limit(1),
      supabase
        .from('goals')
        .select('start_weight_kg, goal_weight_kg, goal_types')
        .eq('user_id', userId)
        .eq('active', true)
        .limit(1),
      supabase
        .from('body_metrics')
        .select('measured_at, weight_kg, bmi, waist_cm, body_fat_pct')
        .eq('user_id', userId)
        .order('measured_at')
        .limit(1000),
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
      supabase
        .from('checkins')
        .select('date, energy, sleep_hours')
        .eq('user_id', userId)
        .gte('date', dayKey(since)),
      supabase.from('achievements').select('id, code, title, description, emoji, xp_reward'),
      supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', userId),
      supabase.rpc('my_achievement_progress'),
    ]);
  const plan = optional(plans)?.[0];
  const goal = optional(goals)?.[0];
  const unlockedAt = new Map(
    (optional(unlocked) ?? []).map((u) => [u.achievement_id, u.unlocked_at]),
  );
  const progressByCode = new Map((optional(progress) ?? []).map((p) => [p.code, p]));
  const forecast = plan?.forecast as { weekly_change_kg?: number } | null | undefined;
  return {
    profile: required(profile),
    plan: plan
      ? {
          dailyCalories: plan.daily_calories,
          proteinG: plan.protein_g,
          waterMl: plan.water_ml,
          weeklyChangeKg:
            typeof forecast?.weekly_change_kg === 'number' ? forecast.weekly_change_kg : null,
        }
      : null,
    goal: goal
      ? { startKg: goal.start_weight_kg, goalKg: goal.goal_weight_kg, types: goal.goal_types }
      : null,
    metrics: optional(metrics) ?? [],
    food: optional(food) ?? [],
    water: optional(water) ?? [],
    checkins: optional(checkins) ?? [],
    achievements: (optional(catalogue) ?? [])
      .map((a) => ({
        code: a.code,
        title: a.title,
        description: a.description,
        emoji: a.emoji,
        xp: a.xp_reward,
        unlockedAt: unlockedAt.get(a.id) ?? null,
        current: Number(progressByCode.get(a.code)?.current ?? 0),
        target: Number(progressByCode.get(a.code)?.target ?? 1),
      }))
      .sort((a, b) => a.xp - b.xp),
  };
}
