import { addDays, dayKey, startOfDay } from '@/lib/dates';
import type { AdaptiveInput } from '@/lib/nutrition';
import { optional, required, supabase } from '@/lib/supabase';

import { minCalories, type CurrentPlan } from '../profile/goals';

/** Two weeks between plan check-ins, looking back three weeks for data. */
export const REVIEW_EVERY_DAYS = 14;
const LOOKBACK_DAYS = 21;

export interface PlanReviewData {
  plan: CurrentPlan;
  planCreatedAt: string;
  input: AdaptiveInput;
}

/**
 * What the plan check-in needs: the current plan, completed days' calorie totals (today is
 * still in progress, so it's left out) and weigh-ins from the last three weeks. Null when the
 * user has no weight-loss plan or no weight yet.
 */
export async function loadPlanReview(userId: string, now: Date): Promise<PlanReviewData | null> {
  const today = startOfDay(now);
  const since = addDays(today, -LOOKBACK_DAYS);
  const [profile, plans, food, weights, energy] = await Promise.all([
    supabase.from('profiles').select('gender').eq('user_id', userId).single(),
    supabase
      .from('plans')
      .select(
        'version, daily_calories, protein_g, carbs_g, fat_g, fiber_g, water_ml, exercise_recommendation, forecast, created_at',
      )
      .eq('user_id', userId)
      .order('version', { ascending: false })
      .limit(1),
    supabase
      .from('food_logs')
      .select('logged_at, calories')
      .eq('user_id', userId)
      .gte('logged_at', since.toISOString())
      .lt('logged_at', today.toISOString()),
    supabase
      .from('body_metrics')
      .select('measured_at, weight_kg')
      .eq('user_id', userId)
      .not('weight_kg', 'is', null)
      .gte('measured_at', since.toISOString())
      .order('measured_at'),
    supabase
      .from('body_metrics')
      .select('bmr')
      .eq('user_id', userId)
      .not('bmr', 'is', null)
      .order('measured_at', { ascending: false })
      .limit(1),
  ]);
  const row = optional(plans)?.[0];
  if (!row) return null;
  const { created_at: planCreatedAt, ...plan } = row;
  const planned = (plan.forecast as { weekly_change_kg?: number } | null)?.weekly_change_kg ?? 0;
  const points = (optional(weights) ?? []).map((w) => ({
    at: new Date(w.measured_at),
    kg: w.weight_kg!,
  }));
  // Only weight-loss plans are checked: surpluses aren't converted to a weight trend (§8).
  if (planned >= 0 || points.length === 0) return null;

  const byDay = new Map<string, number>();
  for (const f of optional(food) ?? []) {
    const key = dayKey(new Date(f.logged_at));
    byDay.set(key, (byDay.get(key) ?? 0) + f.calories);
  }
  const gender = required(profile).gender ?? 'unspecified';
  return {
    plan,
    planCreatedAt,
    input: {
      days: [...byDay].map(([day, kcal]) => ({ day, kcal })),
      weights: points,
      currentTarget: plan.daily_calories,
      plannedWeeklyKg: planned,
      floor: minCalories(gender, optional(energy)?.[0]?.bmr ?? null),
      weightKg: points.at(-1)!.kg,
    },
  };
}
