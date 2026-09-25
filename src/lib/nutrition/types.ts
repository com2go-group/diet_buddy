/** Biological sex used by the BMR and body-fat equations. See bmr.ts for 'unspecified'. */
export type Sex = 'male' | 'female' | 'unspecified';

export type ActivityLevel = 'sedentary' | 'lightly_active' | 'active' | 'very_active';

export type GoalType =
  'lose_fat' | 'build_muscle' | 'body_recomposition' | 'improve_performance' | 'healthy_lifestyle';

export type Pace = 'sustainable' | 'balanced' | 'fast';

export type BmiCategory = 'underweight' | 'normal' | 'overweight' | 'obese';

export interface Body {
  sex: Sex;
  ageYears: number;
  heightCm: number;
  weightKg: number;
}
