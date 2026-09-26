import {
  ACTIVITY_MULTIPLIERS,
  bmi,
  bmr,
  estimateBodyFatPct,
  navyBodyFatPct,
  type ActivityLevel,
  type Sex,
} from '@/lib/nutrition';

export type MetricKey = 'bodyFat' | 'leanMass' | 'fatMass' | 'bmr' | 'tdee' | 'bmi';
export const METRIC_KEYS: readonly MetricKey[] = [
  'bodyFat',
  'leanMass',
  'fatMass',
  'bmr',
  'tdee',
  'bmi',
];

/** Allowed range and precision for each editable value (prototype ranges). */
export const METRIC_RANGES: Record<MetricKey, { min: number; max: number; decimals: number }> = {
  bodyFat: { min: 3, max: 60, decimals: 1 },
  leanMass: { min: 20, max: 150, decimals: 1 },
  fatMass: { min: 2, max: 100, decimals: 1 },
  bmr: { min: 800, max: 4000, decimals: 0 },
  tdee: { min: 1000, max: 6000, decimals: 0 },
  bmi: { min: 10, max: 60, decimals: 1 },
};

export interface ScanInputs {
  sex: Sex;
  ageYears: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  waistCm: number | null;
  neckCm: number | null;
  hipCm: number | null;
}

export type Overrides = Partial<Record<MetricKey, number>>;

export interface ScanResults {
  values: Record<MetricKey, number>;
  /** How body fat was estimated: tape measurements (U.S. Navy), BMI (Deurenberg) or the user's value. */
  method: 'navy' | 'bmi' | 'user';
  overridden: Record<MetricKey, boolean>;
}

/**
 * Body-scan results (CLAUDE.md §7.3). Edited values override calculated ones, and values that
 * depend on an edited one follow it: fat and lean mass use the effective body fat, TDEE uses the
 * effective BMR.
 */
export function scanResults(inputs: ScanInputs, overrides: Overrides = {}): ScanResults {
  const body = {
    sex: inputs.sex,
    ageYears: inputs.ageYears,
    heightCm: inputs.heightCm,
    weightKg: inputs.weightKg,
  };
  const navy =
    inputs.waistCm && inputs.neckCm
      ? navyBodyFatPct(inputs.sex, inputs.heightCm, {
          waistCm: inputs.waistCm,
          neckCm: inputs.neckCm,
          hipCm: inputs.hipCm ?? undefined,
        })
      : null;
  const bodyFat = overrides.bodyFat ?? navy ?? estimateBodyFatPct(body);
  const fatMass = overrides.fatMass ?? (inputs.weightKg * bodyFat) / 100;
  const leanMass = overrides.leanMass ?? inputs.weightKg - fatMass;
  const bmrValue = overrides.bmr ?? bmr(body);
  const tdee = overrides.tdee ?? bmrValue * ACTIVITY_MULTIPLIERS[inputs.activity];
  const bmiValue = overrides.bmi ?? bmi(inputs.weightKg, inputs.heightCm);

  const overridden = Object.fromEntries(
    METRIC_KEYS.map((k) => [k, overrides[k] !== undefined]),
  ) as Record<MetricKey, boolean>;
  return {
    values: { bodyFat, leanMass, fatMass, bmr: bmrValue, tdee, bmi: bmiValue },
    method: overrides.bodyFat !== undefined ? 'user' : navy !== null ? 'navy' : 'bmi',
    overridden,
  };
}

/** Parses an edited value; returns an error when it is outside the allowed range. */
export function parseEdit(
  key: MetricKey,
  value: number | null,
): { value: number } | { error: true } {
  const range = METRIC_RANGES[key];
  if (value === null || !Number.isFinite(value) || value < range.min || value > range.max) {
    return { error: true };
  }
  const factor = 10 ** range.decimals;
  return { value: Math.round(value * factor) / factor };
}
