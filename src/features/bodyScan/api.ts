import { roundTo } from '@/lib/nutrition';
import { optional, supabase } from '@/lib/supabase';

import type { OnboardingDraft } from '../onboarding/draft';
import { METRIC_KEYS, type ScanInputs, type ScanResults } from './results';

/**
 * Saves the body scan as a body_metrics row and moves onboarding on to the initial plan.
 * Weight or height corrected on this screen also update the goal's start weight and the profile.
 */
export async function saveBodyScan(
  userId: string,
  draft: OnboardingDraft,
  goalId: string | null,
  inputs: ScanInputs,
  results: ScanResults,
  fromAiScan = false,
): Promise<void> {
  await insertMetrics(userId, inputs, results, fromAiScan);
  if (goalId && inputs.weightKg !== draft.weightKg) {
    optional(
      await supabase
        .from('goals')
        .update({ start_weight_kg: roundTo(inputs.weightKg, 2) })
        .eq('id', goalId),
    );
  }
  optional(
    await supabase
      .from('profiles')
      .update({ onboarding_step: 'initialPlan', height_cm: roundTo(inputs.heightCm, 1) })
      .eq('user_id', userId),
  );
}

/** A later body check (Progress → Body): just a new progress entry. */
export async function saveBodyCheck(
  userId: string,
  inputs: ScanInputs,
  results: ScanResults,
  fromAiScan: boolean,
): Promise<void> {
  await insertMetrics(userId, inputs, results, fromAiScan);
}

async function insertMetrics(
  userId: string,
  inputs: ScanInputs,
  results: ScanResults,
  fromAiScan: boolean,
): Promise<void> {
  const { values, overridden } = results;
  optional(
    await supabase.from('body_metrics').insert({
      user_id: userId,
      source: fromAiScan ? 'scan' : 'manual',
      weight_kg: roundTo(inputs.weightKg, 2),
      body_fat_pct: roundTo(values.bodyFat, 1),
      lean_mass_kg: roundTo(values.leanMass, 2),
      fat_mass_kg: roundTo(values.fatMass, 2),
      waist_cm: inputs.waistCm === null ? null : roundTo(inputs.waistCm, 1),
      bmr: Math.round(values.bmr),
      tdee: Math.round(values.tdee),
      bmi: roundTo(values.bmi, 1),
      user_overridden: METRIC_KEYS.some((k) => overridden[k]),
    }),
  );
}
