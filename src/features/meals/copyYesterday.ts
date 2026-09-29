import { addDays, dayKey } from '@/lib/dates';

import { logTimeFor } from './portion';
import type { FoodLog, MealSlot, NewFoodLog } from './types';

/**
 * "Same as yesterday": yesterday's logs for one meal, ready to log again on `day` with the same
 * foods, amounts and database numbers. A planned meal copied this way is logged as manual, since
 * it's no longer eaten from today's plan.
 */
export function copyOfMeal(logs: FoodLog[], slot: MealSlot, day: Date, now: Date): NewFoodLog[] {
  return logs
    .filter((l) => l.meal_slot === slot)
    .map((l) => ({
      slot,
      loggedAt: logTimeFor(day, slot, now),
      name: l.name,
      foodRef: l.food_ref,
      quantity: l.quantity,
      unit: l.unit,
      macros: { kcal: l.calories, proteinG: l.protein_g, carbsG: l.carbs_g, fatG: l.fat_g },
      source: l.source === 'plan' ? 'manual' : l.source,
    }));
}

export const previousDay = (day: Date) => addDays(day, -1);
export const sameDay = (a: Date, b: Date) => dayKey(a) === dayKey(b);
