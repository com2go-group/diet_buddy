import {
  computePlan,
  exerciseRecommendation,
  forecastCurve,
  forecastMilestones,
  roundTo,
  type ExerciseSession,
  type ForecastMilestone,
  type Plan,
  type PlanInput,
} from '@/lib/nutrition';
import { toIsoDateLocal } from '@/lib/format';
import type { Json, Tables, TablesInsert } from '@/lib/supabase';

import { planInputFrom, type OnboardingDraft } from '../onboarding/draft';

export type LatestMetric = Pick<
  Tables<'body_metrics'>,
  'weight_kg' | 'bmr' | 'tdee' | 'user_overridden'
>;

export interface InitialPlan {
  input: PlanInput;
  plan: Plan;
  exercise: ExerciseSession[];
  milestones: ForecastMilestone[];
  curve: number[];
}

/**
 * The initial plan (CLAUDE.md §7.4) from the onboarding answers and the body scan. The scan's
 * weight is the starting weight; BMR/TDEE edited on the scan screen override the calculated ones.
 */
export function buildInitialPlan(
  draft: OnboardingDraft,
  metric: LatestMetric | null,
  today = new Date(),
): InitialPlan | null {
  const base = planInputFrom({ ...draft, weightKg: metric?.weight_kg ?? draft.weightKg }, today);
  if (!base) return null;
  const input: PlanInput =
    metric?.user_overridden && metric.bmr && metric.tdee
      ? { ...base, overrides: { bmr: metric.bmr, tdee: metric.tdee } }
      : base;
  const plan = computePlan(input);
  const weight = input.body.weightKg;
  const loss = -plan.weeklyChangeKg;
  const losing = draft.goals.includes('lose_fat') && draft.goalWeightKg !== null;
  return {
    input,
    plan,
    exercise: exerciseRecommendation(draft.training ?? '2_3', draft.goals, weight),
    milestones: losing ? forecastMilestones(weight, draft.goalWeightKg!, loss, today) : [],
    curve: losing ? forecastCurve(weight, draft.goalWeightKg!, loss) : [weight],
  };
}

/** The plans row stored when onboarding completes (version 1 for new users). */
export function planRow(userId: string, version: number, p: InitialPlan): TablesInsert<'plans'> {
  const { plan } = p;
  return {
    user_id: userId,
    version,
    daily_calories: plan.dailyCalories,
    protein_g: plan.macros.proteinG,
    carbs_g: plan.macros.carbsG,
    fat_g: plan.macros.fatG,
    fiber_g: plan.macros.fiberG,
    water_ml: plan.waterMl,
    exercise_recommendation: { sessions: p.exercise } as unknown as Json,
    forecast: {
      weekly_change_kg: roundTo(plan.weeklyChangeKg, 3),
      weeks: plan.timeline?.weeks ?? null,
      goal_date: plan.timeline ? toIsoDateLocal(plan.timeline.goalDate) : null,
      milestones: p.milestones.map((m) => ({
        kind: m.kind,
        weight_kg: roundTo(m.weightKg, 1),
        weeks: m.weeks,
        date: toIsoDateLocal(m.date),
      })),
      warnings: plan.warnings.map((w) => w.code),
    },
    generated_by: 'app',
  };
}
