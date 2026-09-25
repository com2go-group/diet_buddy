import type { StringKey } from '@/i18n';
import {
  ageOn,
  BODY_LIMITS,
  isAdult,
  minimumGoalWeightKg,
  validateGoalWeight,
  type ActivityLevel,
  type GoalType,
  type Pace,
  type PlanInput,
  type Sex,
  type UnitSystem,
} from '@/lib/nutrition';
import type { Enums } from '@/lib/supabase';

import { toIsoDate } from '../auth/schemas';
import { GOAL_DATES, type GoalDateChoice, type StepId } from './options';

import type { DateParts } from '@/components';

export type { DateParts };

/** Everything onboarding collects. Measurements are always metric; inputs convert. */
export interface OnboardingDraft {
  name: string;
  birthDate: DateParts;
  sex: Sex | null;
  healthConsent: boolean;
  units: UnitSystem;
  weightKg: number | null;
  heightCm: number | null;
  goals: GoalType[];
  goalWeightKg: number | null;
  pace: Pace;
  goalDate: GoalDateChoice;
  customGoalDate: DateParts;
  motivations: string[];
  motivationOther: string;
  activity: ActivityLevel | null;
  training: Enums<'training_frequency'> | null;
  dietStyles: string[];
  restrictions: string[];
  restrictionOther: string;
  avoidFoods: string[];
  allergies: string[];
  customAllergies: string[];
}

const emptyDate: DateParts = { day: '', month: '', year: '' };

export const EMPTY_DRAFT: OnboardingDraft = {
  name: '',
  birthDate: emptyDate,
  sex: null,
  healthConsent: false,
  units: 'metric',
  weightKg: null,
  heightCm: null,
  goals: [],
  goalWeightKg: null,
  pace: 'balanced',
  goalDate: 'six_months',
  customGoalDate: emptyDate,
  motivations: [],
  motivationOther: '',
  activity: null,
  training: null,
  dietStyles: [],
  restrictions: [],
  restrictionOther: '',
  avoidFoods: [],
  allergies: [],
  customAllergies: [],
};

export function isoToParts(iso: string | null | undefined): DateParts {
  const match = iso ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso) : null;
  if (!match) return emptyDate;
  return { year: match[1]!, month: String(Number(match[2])), day: String(Number(match[3])) };
}

export function partsToDate(parts: DateParts): Date | null {
  const iso = toIsoDate(parts.day, parts.month, parts.year);
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

/** The target date the user picked, or null if a custom date is incomplete. */
export function goalDateFrom(draft: OnboardingDraft, today = new Date()): Date | null {
  const choice = GOAL_DATES.find((g) => g.id === draft.goalDate);
  if (!choice) return null;
  if (choice.months === null) return partsToDate(draft.customGoalDate);
  return new Date(today.getFullYear(), today.getMonth() + choice.months, today.getDate());
}

/** Plan inputs from the draft, or null until the needed answers exist. */
export function planInputFrom(draft: OnboardingDraft, today = new Date()): PlanInput | null {
  const birth = partsToDate(draft.birthDate);
  if (!birth || !draft.weightKg || !draft.heightCm || !draft.activity) return null;
  const losing = draft.goals.includes('lose_fat');
  if (losing && !draft.goalWeightKg) return null;
  return {
    body: {
      sex: draft.sex ?? 'unspecified',
      ageYears: ageOn(birth, today),
      heightCm: draft.heightCm,
      weightKg: draft.weightKg,
    },
    activity: draft.activity,
    goals: draft.goals,
    goalWeightKg: losing ? (draft.goalWeightKg ?? undefined) : undefined,
    pace: losing ? draft.pace : undefined,
    startDate: today,
  };
}

/**
 * Plan inputs for previews shown before the activity step (pace, goal date). Assumes Lightly
 * Active until the user answers, like the prototype; the final plan uses the real answer.
 */
export function previewInputFrom(draft: OnboardingDraft, today = new Date()): PlanInput | null {
  return planInputFrom({ ...draft, activity: draft.activity ?? 'lightly_active' }, today);
}

export interface StepError {
  key: StringKey;
  params?: Record<string, string | number>;
}
export type StepErrors = Partial<Record<string, StepError>>;

const inRange = (value: number | null, limits: { min: number; max: number }) =>
  value !== null && value >= limits.min && value <= limits.max;

/**
 * Validation for the Continue button. Errors are keyed by field so steps can show them inline.
 * formatWeight is passed in so messages use the user's units.
 */
export function validateStep(
  step: StepId,
  draft: OnboardingDraft,
  formatWeight: (kg: number) => string,
  today = new Date(),
): StepErrors {
  const errors: StepErrors = {};
  switch (step) {
    case 'personal': {
      if (!draft.name.trim()) errors.name = { key: 'authErrors.required' };
      const birth = partsToDate(draft.birthDate);
      if (!birth || birth.getFullYear() < 1900 || birth > today) {
        errors.birthDate = { key: 'authErrors.invalidDate' };
      } else if (!isAdult(birth, today)) {
        errors.birthDate = { key: 'authErrors.underage' };
      }
      if (!draft.sex) errors.sex = { key: 'onboarding.required' };
      break;
    }
    case 'consent':
      if (!draft.healthConsent) errors.consent = { key: 'consent.mustAgree' };
      break;
    case 'measurements': {
      const { weightKg: w, heightCm: h } = BODY_LIMITS;
      if (!inRange(draft.weightKg, w)) {
        errors.weight = {
          key: 'measurements.weightRange',
          params: { min: formatWeight(w.min), max: formatWeight(w.max) },
        };
      }
      if (!inRange(draft.heightCm, h)) {
        errors.height = {
          key: 'measurements.heightRange',
          params: { min: '100 cm', max: '250 cm' },
        };
      }
      break;
    }
    case 'goal':
      if (draft.goals.length === 0) errors.goals = { key: 'onboarding.selectGoal' };
      break;
    case 'goalWeight': {
      const goal = draft.goalWeightKg;
      if (
        !draft.weightKg ||
        !draft.heightCm ||
        goal === null ||
        !inRange(goal, BODY_LIMITS.weightKg)
      ) {
        errors.goalWeight = { key: 'authErrors.required' };
        break;
      }
      const issue = validateGoalWeight(draft.weightKg, goal, draft.heightCm);
      if (issue === 'goal_not_below_current') errors.goalWeight = { key: 'goalWeight.notBelow' };
      if (issue === 'goal_bmi_too_low') {
        errors.goalWeight = {
          key: 'goalWeight.tooLow',
          params: { min: formatWeight(minimumGoalWeightKg(draft.heightCm)) },
        };
      }
      break;
    }
    case 'goalDate': {
      if (draft.goalDate !== 'custom') break;
      const date = partsToDate(draft.customGoalDate);
      const minDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);
      if (!date || date < minDate || date.getFullYear() > today.getFullYear() + 5) {
        errors.customGoalDate = { key: 'goalDate.invalidDate' };
      }
      break;
    }
    case 'activity':
      if (!draft.activity) errors.activity = { key: 'onboarding.required' };
      break;
    case 'trainingFreq':
      if (!draft.training) errors.training = { key: 'onboarding.required' };
      break;
    default:
      break;
  }
  return errors;
}

/** Toggles an item, keeping an exclusive option (e.g. "no_preference") mutually exclusive. */
export function toggleOption(list: readonly string[], id: string, exclusive?: string): string[] {
  if (list.includes(id)) return list.filter((x) => x !== id);
  if (exclusive && id === exclusive) return [id];
  return [...list.filter((x) => x !== exclusive), id];
}

/** Toggling goals clears fat-loss answers when Lose Fat is removed (prototype toggleGoal). */
export function toggleGoal(draft: OnboardingDraft, goal: GoalType): Partial<OnboardingDraft> {
  const goals = draft.goals.includes(goal)
    ? draft.goals.filter((g) => g !== goal)
    : [...draft.goals, goal];
  return goals.includes('lose_fat') ? { goals } : { goals, goalWeightKg: null, pace: 'balanced' };
}
