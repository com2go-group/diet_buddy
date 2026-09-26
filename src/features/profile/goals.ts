import {
  calorieFloor,
  FAT_CALORIE_FRACTION,
  FIBER_G_PER_1000_KCAL,
  KCAL_PER_GRAM,
  weeklyKgForDailyDeficit,
  type Sex,
} from '@/lib/nutrition';

export interface CurrentPlan {
  version: number;
  daily_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  water_ml: number;
  exercise_recommendation: unknown;
  forecast: unknown;
}

export const CALORIE_MAX = 6000;
export const WATER_LIMITS_ML = [1000, 5000] as const;

/** The lowest calorie target allowed (CLAUDE.md §9): max(sex floor, BMR). */
export function minCalories(sex: Sex, bmrKcal: number | null): number {
  return Math.round(calorieFloor(sex, bmrKcal ?? 0));
}

/**
 * A new plan version with a different calorie target: protein stays, fat is 30 % of calories,
 * carbs take the rest (§8). Throws below the safety floor. The weekly rate in the forecast follows
 * the new deficit when TDEE is known.
 */
export function withCalories(
  plan: CurrentPlan,
  kcal: number,
  floor: number,
  tdee: number | null,
): Omit<CurrentPlan, 'version'> & { version: number } {
  const calories = Math.round(kcal);
  if (calories < floor || calories > CALORIE_MAX) throw new RangeError('calories out of range');
  const fatG = Math.round((calories * FAT_CALORIE_FRACTION) / KCAL_PER_GRAM.fat);
  const carbKcal = calories - plan.protein_g * KCAL_PER_GRAM.protein - fatG * KCAL_PER_GRAM.fat;
  const forecast = { ...((plan.forecast as Record<string, unknown> | null) ?? {}) };
  if (tdee)
    forecast.weekly_change_kg = Math.round(-weeklyKgForDailyDeficit(tdee - calories) * 1000) / 1000;
  return {
    ...plan,
    version: plan.version + 1,
    daily_calories: calories,
    fat_g: fatG,
    carbs_g: Math.max(0, Math.round(carbKcal / KCAL_PER_GRAM.carbs)),
    fiber_g: Math.round((calories / 1000) * FIBER_G_PER_1000_KCAL),
    forecast,
  };
}

export function withWater(plan: CurrentPlan, ml: number) {
  const water = Math.round(ml / 50) * 50;
  if (water < WATER_LIMITS_ML[0] || water > WATER_LIMITS_ML[1])
    throw new RangeError('water out of range');
  return { ...plan, version: plan.version + 1, water_ml: water };
}
