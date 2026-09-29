import {
  macroTargets,
  nextMaintenanceTarget,
  proteinReferenceWeightKg,
  type GoalType,
} from '@/lib/nutrition';
import { optional, supabase } from '@/lib/supabase';

import { editDraft, withLosing } from '../goalEdit/goalEdit';
import { buildInitialPlan, planRow, type InitialPlan } from '../plan/buildPlan';
import { loadInitialPlan } from '../plan/api';
import { trendSeries, weightSeries } from '../progress/stats';

export interface GoalJourney {
  goal: {
    id: string;
    goalTypes: GoalType[];
    goalKg: number | null;
    reachedAt: string | null;
  } | null;
  plan: { dailyCalories: number; generatedBy: string; createdAt: string } | null;
  /** Smoothed trend weight from the last 60 days of weigh-ins. */
  trendKg: number | null;
}

export async function loadGoalJourney(userId: string, now: Date): Promise<GoalJourney> {
  const since = new Date(now.getTime() - 60 * 86_400_000).toISOString();
  const [goals, plans, metrics] = await Promise.all([
    supabase
      .from('goals')
      .select('id, goal_types, goal_weight_kg, reached_at')
      .eq('user_id', userId)
      .eq('active', true)
      .limit(1),
    supabase
      .from('plans')
      .select('daily_calories, generated_by, created_at')
      .eq('user_id', userId)
      .order('version', { ascending: false })
      .limit(1),
    supabase
      .from('body_metrics')
      .select('measured_at, weight_kg, bmi, waist_cm, body_fat_pct')
      .eq('user_id', userId)
      .not('weight_kg', 'is', null)
      .gte('measured_at', since)
      .order('measured_at'),
  ]);
  const g = optional(goals)?.[0];
  const p = optional(plans)?.[0];
  const trend = trendSeries(weightSeries(optional(metrics) ?? [], now, 60));
  return {
    goal: g
      ? {
          id: g.id,
          goalTypes: g.goal_types,
          goalKg: g.goal_weight_kg,
          reachedAt: g.reached_at,
        }
      : null,
    plan: p
      ? { dailyCalories: p.daily_calories, generatedBy: p.generated_by, createdAt: p.created_at }
      : null,
    trendKg: trend.length ? trend[trend.length - 1]!.kg : null,
  };
}

/**
 * The maintenance plan for the user's latest weight (their goals without weight loss) and the
 * step towards it from the current target. Every safety floor applies (computePlan).
 */
export async function maintenancePlan(
  userId: string,
  currentKcal: number,
  now = new Date(),
): Promise<{ step: InitialPlan; maintenanceKcal: number; goals: GoalType[] } | null> {
  const data = await loadInitialPlan(userId);
  const draft = withLosing(editDraft(data.state.draft, data.metric), false);
  const built = buildInitialPlan(draft, data.metric, now);
  if (!built) return null;
  const maintenanceKcal = built.plan.dailyCalories;
  const target = nextMaintenanceTarget(currentKcal, maintenanceKcal) ?? maintenanceKcal;
  const macros = macroTargets(target, proteinReferenceWeightKg(built.input.body), draft.goals);
  return {
    maintenanceKcal,
    goals: draft.goals,
    step: {
      ...built,
      plan: {
        ...built.plan,
        dailyCalories: target,
        dailyCalorieDelta: Math.round(target - built.plan.tdee),
        weeklyChangeKg: 0,
        macros,
        timeline: null,
      },
      milestones: [],
    },
  };
}

/**
 * Saves the next maintenance step as a new plan version. The first step also turns the goal into
 * a maintenance goal: weight loss off, the goal weight kept as the weight to maintain, the date
 * it was reached recorded.
 */
export async function applyMaintenanceStep(
  userId: string,
  journey: GoalJourney,
  now = new Date(),
): Promise<number | null> {
  if (!journey.plan) return null;
  const result = await maintenancePlan(userId, journey.plan.dailyCalories, now);
  if (!result) return null;
  const latest = optional(
    await supabase
      .from('plans')
      .select('version')
      .eq('user_id', userId)
      .order('version', { ascending: false })
      .limit(1),
  );
  optional(
    await supabase.from('plans').insert({
      ...planRow(userId, (latest?.[0]?.version ?? 0) + 1, result.step),
      generated_by: 'maintenance',
    }),
  );
  if (journey.goal && !journey.goal.reachedAt) {
    optional(
      await supabase
        .from('goals')
        .update({
          goal_types: result.goals,
          pace: null,
          goal_date: null,
          reached_at: now.toISOString(),
        })
        .eq('id', journey.goal.id),
    );
  }
  return result.step.plan.dailyCalories;
}
