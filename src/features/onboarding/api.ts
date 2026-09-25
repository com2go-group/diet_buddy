import { computePlan, type Plan } from '@/lib/nutrition';
import { roundTo } from '@/lib/nutrition';
import { toIsoDateLocal } from '@/lib/format';
import { optional, required, supabase, type Tables, type TablesUpdate } from '@/lib/supabase';

import { toIsoDate } from '../auth/schemas';
import {
  EMPTY_DRAFT,
  goalDateFrom,
  isoToParts,
  planInputFrom,
  type OnboardingDraft,
} from './draft';
import { buildSteps, type StepId } from './options';

/** Version of the health-data consent text shown in onboarding (stored with the consent). */
export const HEALTH_CONSENT_VERSION = '2026-09-25';

const CUSTOM_ALLERGY_SEPARATOR = '; ';

export interface OnboardingState {
  draft: OnboardingDraft;
  step: StepId;
  goalId: string | null;
}

/** Rebuilds the draft and current step from what was saved, so onboarding can resume. */
export async function loadOnboarding(userId: string): Promise<OnboardingState> {
  const [profile, goal, prefs, consent] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', userId).single().then(required),
    supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .maybeSingle()
      .then(optional),
    supabase.from('preferences').select('*').eq('user_id', userId).maybeSingle().then(optional),
    supabase
      .from('consents')
      .select('granted')
      .eq('user_id', userId)
      .eq('consent_type', 'health_data')
      .maybeSingle()
      .then(optional),
  ]);

  const draft: OnboardingDraft = {
    ...EMPTY_DRAFT,
    name: profile.name ?? '',
    birthDate: isoToParts(profile.birth_date),
    sex: profile.gender,
    units: profile.units,
    heightCm: profile.height_cm,
    healthConsent: consent?.granted ?? false,
    ...(goal && {
      goals: goal.goal_types,
      weightKg: goal.start_weight_kg,
      goalWeightKg: goal.goal_weight_kg,
      pace: goal.pace ?? 'balanced',
      ...(goal.goal_date && {
        goalDate: 'custom' as const,
        customGoalDate: isoToParts(goal.goal_date),
      }),
      motivations: goal.motivations,
      motivationOther: goal.motivation_other ?? '',
    }),
    ...(prefs && {
      activity: prefs.activity_level,
      training: prefs.training_frequency,
      dietStyles: prefs.diet_styles,
      restrictions: prefs.restrictions,
      restrictionOther: prefs.restriction_other ?? '',
      avoidFoods: prefs.avoid_foods,
      allergies: prefs.allergies,
      customAllergies: prefs.allergy_other
        ? prefs.allergy_other.split(CUSTOM_ALLERGY_SEPARATOR)
        : [],
    }),
  };

  const steps = buildSteps(draft.goals);
  const saved = profile.onboarding_step as StepId | null;
  return {
    draft,
    step: saved && steps.includes(saved) ? saved : 'personal',
    goalId: goal?.id ?? null,
  };
}

const GOAL_STEPS: readonly StepId[] = [
  'measurements',
  'goal',
  'goalWeight',
  'pace',
  'goalDate',
  'motivation',
];
const PREFERENCE_STEPS: readonly StepId[] = [
  'activity',
  'trainingFreq',
  'dietStyle',
  'restrictions',
  'avoidFoods',
  'allergies',
];

function goalRow(draft: OnboardingDraft) {
  const losing = draft.goals.includes('lose_fat');
  const target = goalDateFrom(draft);
  return {
    goal_types: draft.goals,
    start_weight_kg: draft.weightKg,
    goal_weight_kg: losing ? draft.goalWeightKg : null,
    pace: losing ? draft.pace : null,
    goal_date: target ? toIsoDateLocal(target) : null,
    motivations: draft.motivations,
    motivation_other: draft.motivations.includes('other')
      ? draft.motivationOther.trim() || null
      : null,
  };
}

function preferencesRow(draft: OnboardingDraft) {
  return {
    activity_level: draft.activity,
    training_frequency: draft.training,
    diet_styles: draft.dietStyles,
    restrictions: draft.restrictions,
    restriction_other: draft.restrictions.includes('other')
      ? draft.restrictionOther.trim() || null
      : null,
    avoid_foods: draft.avoidFoods,
    allergies: draft.allergies,
    allergy_other: draft.customAllergies.join(CUSTOM_ALLERGY_SEPARATOR).slice(0, 200) || null,
  };
}

/**
 * Saves what a step collected and records the next step. The profile goes first because the goal
 * trigger checks goal BMI against the saved height. Returns the (possibly new) active goal id.
 */
export async function saveStep(
  userId: string,
  /** The step whose answers to save, or null to record progress only (a skipped step). */
  step: StepId | null,
  next: StepId,
  draft: OnboardingDraft,
  goalId: string | null,
): Promise<string | null> {
  const profile: TablesUpdate<'profiles'> = { onboarding_step: next };
  if (step === 'personal') {
    const { day, month, year } = draft.birthDate;
    Object.assign(profile, {
      name: draft.name.trim(),
      birth_date: toIsoDate(day, month, year),
      gender: draft.sex,
    });
  }
  if (step === 'measurements')
    Object.assign(profile, { height_cm: draft.heightCm, units: draft.units });
  optional(await supabase.from('profiles').update(profile).eq('user_id', userId));

  if (step === 'consent') {
    // An RPC, not an upsert: users may only update granted/version (see the set_consent migration).
    optional(
      await supabase.rpc('set_consent', {
        p_type: 'health_data',
        p_granted: true,
        p_version: HEALTH_CONSENT_VERSION,
      }),
    );
  }

  if (step && GOAL_STEPS.includes(step)) {
    if (goalId) {
      optional(await supabase.from('goals').update(goalRow(draft)).eq('id', goalId));
    } else {
      const result = await supabase
        .from('goals')
        .insert({ user_id: userId, ...goalRow(draft) })
        .select('id')
        .single();
      goalId = required(result).id;
    }
  }

  if (step && PREFERENCE_STEPS.includes(step)) {
    optional(
      await supabase
        .from('preferences')
        .upsert({ user_id: userId, ...preferencesRow(draft) }, { onConflict: 'user_id' }),
    );
  }
  return goalId;
}

/**
 * Finishes onboarding: first body-metrics entry, plan version 1, then marks the profile complete
 * (last, so a failure part-way leaves the user in onboarding to retry).
 */
export async function completeOnboarding(userId: string, draft: OnboardingDraft): Promise<Plan> {
  const input = planInputFrom(draft);
  if (!input) throw new Error('Onboarding is incomplete');
  const plan = computePlan(input);

  optional(
    await supabase.from('body_metrics').insert({
      user_id: userId,
      source: 'manual',
      weight_kg: input.body.weightKg,
      bmi: roundTo(plan.bmi, 1),
      bmr: plan.bmr,
      tdee: plan.tdee,
    }),
  );

  const latest = required(
    await supabase
      .from('plans')
      .select('version')
      .eq('user_id', userId)
      .order('version', { ascending: false })
      .limit(1),
  ) as Pick<Tables<'plans'>, 'version'>[];
  optional(
    await supabase.from('plans').insert({
      user_id: userId,
      version: (latest[0]?.version ?? 0) + 1,
      daily_calories: plan.dailyCalories,
      protein_g: plan.macros.proteinG,
      carbs_g: plan.macros.carbsG,
      fat_g: plan.macros.fatG,
      fiber_g: plan.macros.fiberG,
      water_ml: plan.waterMl,
      forecast: {
        weekly_change_kg: roundTo(plan.weeklyChangeKg, 3),
        weeks: plan.timeline?.weeks ?? null,
        goal_date: plan.timeline ? toIsoDateLocal(plan.timeline.goalDate) : null,
        warnings: plan.warnings.map((w) => w.code),
      },
      generated_by: 'app',
    }),
  );

  optional(
    await supabase
      .from('profiles')
      .update({ onboarding_completed_at: new Date().toISOString(), onboarding_step: null })
      .eq('user_id', userId),
  );
  return plan;
}
