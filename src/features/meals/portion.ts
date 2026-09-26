import { addDays, dayKey, startOfDay } from '@/lib/dates';

import type { FoodLog, Macros, MealSlot, PortionFood } from './types';

export const MEAL_SLOTS: readonly MealSlot[] = ['breakfast', 'lunch', 'snack', 'dinner'];
export const SLOT_EMOJI: Record<MealSlot, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  snack: '🍎',
  dinner: '🌙',
};

/** Suggested share of the daily target per meal (prototype: 400/550/180/650 of 1,780 kcal). */
export const SLOT_SHARE: Record<MealSlot, number> = {
  breakfast: 0.25,
  lunch: 0.3,
  snack: 0.1,
  dinner: 0.35,
};

export const slotTarget = (dailyKcal: number, slot: MealSlot) =>
  Math.round((dailyKcal * SLOT_SHARE[slot]) / 10) * 10;

/** Typical times, used when logging for an earlier day. */
const SLOT_HOUR: Record<MealSlot, [number, number]> = {
  breakfast: [8, 0],
  lunch: [12, 30],
  snack: [15, 30],
  dinner: [19, 0],
};

/** Today: now. An earlier day: that day at the meal's typical time. */
export function logTimeFor(day: Date, slot: MealSlot, now: Date): Date {
  if (dayKey(day) === dayKey(now)) return now;
  const [h, m] = SLOT_HOUR[slot];
  const at = startOfDay(day);
  at.setHours(h, m, 0, 0);
  return at;
}

/** [start, end) of a local day, for querying logged_at. */
export function dayRange(day: Date): [Date, Date] {
  const start = startOfDay(day);
  return [start, addDays(start, 1)];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function scaleMacros(base: Macros, factor: number): Macros {
  return {
    kcal: Math.round(base.kcal * factor),
    proteinG: round1(base.proteinG * factor),
    carbsG: round1(base.carbsG * factor),
    fatG: round1(base.fatG * factor),
  };
}

export function macrosFor(
  food: PortionFood,
  amount: number,
  unit: 'g' | number | 'portion',
): Macros {
  if (food.kind === 'portion') return scaleMacros(food.portion, amount);
  const grams =
    unit === 'g' ? amount : typeof unit === 'number' ? amount * food.servings[unit]!.grams : amount;
  return scaleMacros(food.per100g, grams / 100);
}

/** Quantity and unit to store for a portion food re-logged `amount` times. */
export function portionQuantity(
  food: Extract<PortionFood, { kind: 'portion' }>,
  amount: number,
): { quantity: number | null; unit: string | null } {
  if (food.logged.quantity)
    return { quantity: food.logged.quantity * amount, unit: food.logged.unit };
  return amount === 1
    ? { quantity: null, unit: food.logged.unit }
    : { quantity: amount, unit: 'portion' };
}

/** Grams logged, for foods measured in grams or servings. */
export function gramsFor(
  food: PortionFood,
  amount: number,
  unit: 'g' | number | 'portion',
): number | null {
  if (food.kind === 'portion') return null;
  return unit === 'g'
    ? amount
    : typeof unit === 'number'
      ? amount * food.servings[unit]!.grams
      : null;
}

export const AMOUNT_LIMITS = { g: [1, 5000], serving: [0.25, 50], portion: [0.25, 20] } as const;

export function totals(
  logs: Pick<FoodLog, 'calories' | 'protein_g' | 'carbs_g' | 'fat_g'>[],
): Macros {
  const sum = (pick: (l: (typeof logs)[number]) => number) => logs.reduce((t, l) => t + pick(l), 0);
  return {
    kcal: Math.round(sum((l) => l.calories)),
    proteinG: round1(sum((l) => l.protein_g)),
    carbsG: round1(sum((l) => l.carbs_g)),
    fatG: round1(sum((l) => l.fat_g)),
  };
}

/**
 * Recent foods for quick re-logging: newest log per name. Logs measured in grams become
 * per-100 g foods again (so any amount can be chosen); others scale by portions.
 */
export function recentFoods(logs: FoodLog[], limit = 15): PortionFood[] {
  const seen = new Set<string>();
  const foods: PortionFood[] = [];
  for (const log of [...logs].sort((a, b) => b.logged_at.localeCompare(a.logged_at))) {
    const key = log.name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const logged: Macros = {
      kcal: log.calories,
      proteinG: log.protein_g,
      carbsG: log.carbs_g,
      fatG: log.fat_g,
    };
    if (log.unit === 'g' && log.quantity && log.quantity > 0) {
      foods.push({
        kind: 'per100g',
        ref: log.food_ref,
        name: log.name,
        brand: null,
        per100g: scaleMacros(logged, 100 / log.quantity),
        servings: [{ label: `${Number(log.quantity)} g`, grams: Number(log.quantity) }],
      });
    } else {
      foods.push({
        kind: 'portion',
        ref: log.food_ref,
        name: log.name,
        brand: null,
        portion: logged,
        portionLabel: log.quantity
          ? `${Number(log.quantity)} ${log.unit ?? ''}`.trim()
          : `${Math.round(log.calories)} kcal`,
        logged: { quantity: log.quantity === null ? null : Number(log.quantity), unit: log.unit },
      });
    }
    if (foods.length >= limit) break;
  }
  return foods;
}
