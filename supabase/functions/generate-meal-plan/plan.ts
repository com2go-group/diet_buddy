import { z } from 'npm:zod@4';

import type { FoodResult } from '../_shared/usda.ts';

export const SLOTS = ['breakfast', 'lunch', 'snack', 'dinner'] as const;
export type Slot = (typeof SLOTS)[number];

/** Same split as the Meals tab (src/features/meals/portion.ts). */
export const SLOT_SHARE: Record<Slot, number> = {
  breakfast: 0.25,
  lunch: 0.3,
  snack: 0.1,
  dinner: 0.35,
};

const aiItem = z.object({
  name: z.string().trim().min(1).max(80),
  usda_query: z.string().trim().min(2).max(80),
  grams: z.number().positive().max(1000),
});
export const aiPlanSchema = z.object({
  meals: z.object({
    breakfast: z.array(aiItem).min(1).max(5),
    lunch: z.array(aiItem).min(1).max(5),
    snack: z.array(aiItem).min(1).max(4),
    dinner: z.array(aiItem).min(1).max(5),
  }),
});
export type AiPlan = z.infer<typeof aiPlanSchema>;

export interface PlannedItem {
  name: string;
  foodRef: string;
  /** USDA description the numbers come from (shown for transparency, checked for allergens). */
  source: string;
  grams: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface MealPlan {
  version: 1;
  date: string;
  slots: Record<Slot, PlannedItem[]>;
  totals: { kcal: number; proteinG: number; carbsG: number; fatG: number };
  targets: { kcal: number; proteinG: number };
  promptVersion: string;
  model: string;
  generatedAt: string;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** The best USDA match for a query: generic foods first (no brand), then anything with energy. */
export function pickFood(results: FoodResult[]): FoodResult | null {
  return (
    results.find((r) => r.brand === null && r.per100g.kcal > 0) ??
    results.find((r) => r.per100g.kcal > 0) ??
    null
  );
}

export function itemFor(name: string, food: FoodResult, grams: number): PlannedItem {
  const g = Math.max(10, Math.min(600, Math.round(grams / 5) * 5));
  const f = g / 100;
  return {
    name,
    foodRef: food.ref,
    source: food.name,
    grams: g,
    kcal: Math.round(food.per100g.kcal * f),
    proteinG: round1(food.per100g.proteinG * f),
    carbsG: round1(food.per100g.carbsG * f),
    fatG: round1(food.per100g.fatG * f),
  };
}

/**
 * Scales each meal's portions so it lands near its share of the daily target (numbers stay
 * USDA-based; only grams change). The factor is limited to 0.6–1.6 so portions stay realistic.
 */
export function scaleSlot(
  items: { name: string; food: FoodResult; grams: number }[],
  targetKcal: number,
): PlannedItem[] {
  const kcal = items.reduce((t, i) => t + (i.food.per100g.kcal * i.grams) / 100, 0);
  const factor = kcal > 0 ? Math.max(0.6, Math.min(1.6, targetKcal / kcal)) : 1;
  return items.map((i) => itemFor(i.name, i.food, i.grams * factor));
}

export function totals(slots: Record<Slot, PlannedItem[]>): MealPlan['totals'] {
  const all = SLOTS.flatMap((s) => slots[s]);
  return {
    kcal: all.reduce((t, i) => t + i.kcal, 0),
    proteinG: round1(all.reduce((t, i) => t + i.proteinG, 0)),
    carbsG: round1(all.reduce((t, i) => t + i.carbsG, 0)),
    fatG: round1(all.reduce((t, i) => t + i.fatG, 0)),
  };
}
