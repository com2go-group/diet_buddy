import type { GoalType } from '@/lib/nutrition';

import type { OnboardingDraft } from '../onboarding/draft';
import { validateStep, type StepErrors } from '../onboarding/draft';
import { buildInitialPlan, type InitialPlan, type LatestMetric } from '../plan/buildPlan';

/**
 * Changing the weight goal or pace after onboarding (Profile → Weight goal). The answers live in
 * an onboarding-style draft so the same steps, checks (goal BMI ≥ 18.5, below the current weight)
 * and plan maths apply; the plan is rebuilt from the latest weight with every safety floor.
 */

/** Turns a weight-loss goal on (keeping the other goals) or off (Healthy Lifestyle if none left). */
export function withLosing(draft: OnboardingDraft, losing: boolean): OnboardingDraft {
  const others = draft.goals.filter((g) => g !== 'lose_fat');
  if (losing) return { ...draft, goals: ['lose_fat', ...others] as GoalType[] };
  return {
    ...draft,
    goals: (others.length ? others : ['healthy_lifestyle']) as GoalType[],
    goalWeightKg: null,
  };
}

export const isLosing = (draft: OnboardingDraft) => draft.goals.includes('lose_fat');

/** The draft for editing: planned from the latest weight, not the one given at sign-up. */
export function editDraft(draft: OnboardingDraft, metric: LatestMetric | null): OnboardingDraft {
  return { ...draft, weightKg: metric?.weight_kg ?? draft.weightKg };
}

export function goalErrors(
  draft: OnboardingDraft,
  formatWeight: (kg: number, decimals?: number) => string,
): StepErrors {
  return isLosing(draft) ? validateStep('goalWeight', draft, formatWeight) : {};
}

/** The new plan for these answers, or null while they are incomplete or invalid. */
export function previewPlan(
  draft: OnboardingDraft,
  metric: LatestMetric | null,
  formatWeight: (kg: number, decimals?: number) => string,
  today = new Date(),
): InitialPlan | null {
  if (Object.keys(goalErrors(draft, formatWeight)).length > 0) return null;
  try {
    return buildInitialPlan(draft, metric, today);
  } catch {
    return null;
  }
}
