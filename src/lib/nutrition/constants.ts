import type { ActivityLevel, Pace, Sex } from './types';

/** Energy content of 1 kg of body fat, used for deficit ↔ weight-change conversions. */
export const KCAL_PER_KG_FAT = 7700;

export const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  active: 1.55,
  very_active: 1.725,
};

/**
 * Nominal weekly loss per pace (kg/week). 'fast' is advertised as 0.75–1.0 kg/week;
 * the actual rate is chosen in pace.ts from body weight and then capped for safety.
 */
export const PACE_WEEKLY_KG: Record<Pace, number> = {
  sustainable: 0.25,
  balanced: 0.5,
  fast: 0.75,
};
export const FAST_PACE_MAX_WEEKLY_KG = 1.0;

/** Weekly loss may never exceed this fraction of current body weight (CLAUDE.md §9). */
export const MAX_WEEKLY_LOSS_FRACTION = 0.01;

/**
 * Absolute calorie floors (CLAUDE.md §9). The effective floor is max(this, BMR).
 * 'unspecified' uses the midpoint, consistent with how BMR is averaged for it.
 */
export const CALORIE_FLOOR: Record<Sex, number> = {
  female: 1200,
  male: 1500,
  unspecified: 1350,
};

export const BUILD_MUSCLE_SURPLUS_KCAL = 250;
/** Recomposition runs a small deficit when BMI is at or above this, maintenance otherwise. */
export const RECOMP_DEFICIT_BMI_THRESHOLD = 25;
export const RECOMP_DEFICIT_KCAL = 250;

export const PROTEIN_G_PER_KG = { default: 1.8, buildMuscle: 2.2 } as const;
/** At or above this BMI, protein is based on goal or adjusted body weight instead of current weight. */
export const PROTEIN_HIGH_BMI_THRESHOLD = 30;

export const FAT_CALORIE_FRACTION = 0.3;
/** Dietary fiber guideline: 14 g per 1,000 kcal. */
export const FIBER_G_PER_1000_KCAL = 14;

export const WATER_ML_PER_KG = 35;
export const WATER_ACTIVE_BONUS_ML = 500;
export const WATER_MIN_ML = 1500;
export const WATER_MAX_ML = 4000;

export const BMI_UNDERWEIGHT = 18.5;
export const BMI_OVERWEIGHT = 25;
export const BMI_OBESE = 30;

export const MIN_AGE_YEARS = 18;
