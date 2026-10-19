import { toIsoDateLocal } from '@/lib/format';
import { optional, supabase } from '@/lib/supabase';

import type { OnboardingDraft } from '../onboarding/draft';
import { loadInitialPlan, type InitialPlanData } from '../plan/api';
import { planRow, type InitialPlan } from '../plan/buildPlan';
import { isLosing } from './goalEdit';

export type GoalEditData = InitialPlanData & { currentKcal: number | null };

/** The saved answers, the latest body values and today's calorie target (to show the change). */
export async function loadGoalEdit(userId: string): Promise<GoalEditData> {
  const [data, plans] = await Promise.all([
    loadInitialPlan(userId),
    supabase
      .from('plans')
      .select('daily_calories')
      .eq('user_id', userId)
      .order('version', { ascending: false })
      .limit(1),
  ]);
  return { ...data, currentKcal: optional(plans)?.[0]?.daily_calories ?? null };
}

/**
 * Saves changed goals: the activity level and training days (preferences), the active goal row
 * (goal types, goal weight, pace, and the estimated goal date from the new plan) and a new plan
 * version. The start weight is kept, so "total lost" still counts from the beginning.
 */
export async function saveGoalEdit(
  userId: string,
  goalId: string | null,
  draft: OnboardingDraft,
  built: InitialPlan,
): Promise<void> {
  const losing = isLosing(draft);
  optional(
    await supabase
      .from('preferences')
      .upsert(
        { user_id: userId, activity_level: draft.activity, training_frequency: draft.training },
        { onConflict: 'user_id' },
      ),
  );
  const goal = {
    goal_types: draft.goals,
    goal_weight_kg: losing ? draft.goalWeightKg : null,
    pace: losing ? draft.pace : null,
    goal_date: built.plan.timeline ? toIsoDateLocal(built.plan.timeline.goalDate) : null,
  };
  if (goalId) {
    optional(await supabase.from('goals').update(goal).eq('id', goalId));
  } else {
    optional(
      await supabase
        .from('goals')
        .insert({ user_id: userId, start_weight_kg: draft.weightKg, motivations: [], ...goal }),
    );
  }
  const latest = optional(
    await supabase
      .from('plans')
      .select('version')
      .eq('user_id', userId)
      .order('version', { ascending: false })
      .limit(1),
  );
  const version = (latest?.[0]?.version ?? 0) + 1;
  optional(
    await supabase
      .from('plans')
      .insert({ ...planRow(userId, version, built), generated_by: 'profile' }),
  );
}
