/** Meal budget and dish scoring for restaurant mode (pure; unit-tested). */

export type Slot = 'breakfast' | 'lunch' | 'snack' | 'dinner';

/** Same split as the Meals tab and meal plans. */
export const SLOT_SHARE: Record<Slot, number> = {
  breakfast: 0.25,
  lunch: 0.3,
  snack: 0.1,
  dinner: 0.35,
};

export interface Budget {
  kcal: number;
  proteinG: number;
}

/**
 * Calories: the meal's share of the daily target, lowered to what is left today when less
 * remains, but never below a quarter of the share (the app doesn't push people to skip meals).
 * Protein: the meal's share of the daily protein target.
 */
export function mealBudget(
  daily: { calories: number; proteinG: number },
  eatenToday: { kcal: number },
  slot: Slot,
): Budget {
  const shareKcal = daily.calories * SLOT_SHARE[slot];
  const leftKcal = daily.calories - eatenToday.kcal;
  const kcal = Math.max(shareKcal * 0.25, Math.min(shareKcal, leftKcal));
  return {
    kcal: Math.round(kcal / 10) * 10,
    proteinG: Math.round(daily.proteinG * SLOT_SHARE[slot]),
  };
}

/**
 * 0–100: calories close to the budget (full marks from 80% to 110%; faster drop when over) and
 * protein toward the meal's protein goal. Dishes with an allergy or restriction warning score 0.
 */
export function scoreDish(dish: { kcal: number; proteinG: number }, budget: Budget): number {
  const ratio = dish.kcal / Math.max(budget.kcal, 1);
  let kcalFit: number;
  if (ratio >= 0.8 && ratio <= 1.1) kcalFit = 1;
  else if (ratio < 0.8) kcalFit = Math.max(0, ratio / 0.8);
  else kcalFit = Math.max(0, 1 - (ratio - 1.1) / 0.9);
  const proteinFit = Math.min(1, dish.proteinG / Math.max(budget.proteinG, 1));
  return Math.round((kcalFit * 0.6 + proteinFit * 0.4) * 100);
}
