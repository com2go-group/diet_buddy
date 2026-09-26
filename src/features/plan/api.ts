import { optional, supabase } from '@/lib/supabase';

import { loadOnboarding, type OnboardingState } from '../onboarding/api';
import { planRow, type InitialPlan, type LatestMetric } from './buildPlan';

export interface InitialPlanData {
  state: OnboardingState;
  metric: LatestMetric | null;
}

export async function loadInitialPlan(userId: string): Promise<InitialPlanData> {
  const [state, metrics] = await Promise.all([
    loadOnboarding(userId),
    supabase
      .from('body_metrics')
      .select('weight_kg, bmr, tdee, user_overridden')
      .eq('user_id', userId)
      .order('measured_at', { ascending: false })
      .limit(1),
  ]);
  const rows = optional(metrics) ?? [];
  return { state, metric: rows[0] ?? null };
}

/**
 * Stores the plan and completes onboarding. Completion is written last, so a failure part-way
 * leaves the user on this screen to retry.
 */
export async function completeOnboarding(userId: string, plan: InitialPlan): Promise<void> {
  const latest = optional(
    await supabase
      .from('plans')
      .select('version')
      .eq('user_id', userId)
      .order('version', { ascending: false })
      .limit(1),
  );
  optional(
    await supabase.from('plans').insert(planRow(userId, (latest?.[0]?.version ?? 0) + 1, plan)),
  );
  optional(
    await supabase
      .from('profiles')
      .update({ onboarding_completed_at: new Date().toISOString(), onboarding_step: null })
      .eq('user_id', userId),
  );
}
