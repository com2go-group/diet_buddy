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
/** One complete meal: a named dish, how to put it together, and its ingredients. */
const aiMeal = (maxIngredients: number) =>
  z.object({
    title: z.string().trim().min(3).max(80),
    description: z.string().trim().max(200).default(''),
    ingredients: z.array(aiItem).min(1).max(maxIngredients),
    steps: z.array(z.string().trim().min(3).max(200)).max(6).default([]),
    prep_minutes: z.number().int().min(1).max(180).optional(),
  });
export const aiPlanSchema = z.object({
  meals: z.object({
    breakfast: aiMeal(6),
    lunch: aiMeal(6),
    snack: aiMeal(4),
    dinner: aiMeal(6),
  }),
});
export type AiPlan = z.infer<typeof aiPlanSchema>;
/** "Another idea" for one meal. */
export const aiMealSchema = z.object({ meal: aiMeal(6) });
export type AiMeal = z.infer<typeof aiMealSchema>['meal'];

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

export interface Dish {
  title: string;
  description: string;
  /** Short recipe steps (version 3 plans). */
  steps?: string[];
  prepMinutes?: number;
}

/**
 * Recipe steps as shown: amounts are removed (portions are listed with the ingredients and adapt
 * during the day) and steps that talk about calories are dropped (numbers come from USDA only).
 */
export function cleanSteps(steps: string[]): string[] {
  return steps
    .filter((s) => !/\b(k?cal|calories?|kilojoules?|kj)\b/i.test(s))
    .map((s) =>
      s
        .replace(
          /\b\d+(?:[.,]\d+)?\s*(?:g|grams?|kg|ml|millilit(?:er|re)s?|oz|ounces?)\b\s*(?:of\s+)?/gi,
          '',
        )
        .replace(/\s{2,}/g, ' ')
        .trim(),
    )
    .filter((s) => s.length >= 3);
}

export interface MealPlan {
  version: 1 | 2;
  date: string;
  /** Each meal's ingredients, with USDA numbers. */
  slots: Record<Slot, PlannedItem[]>;
  /** Each meal as a dish (version 2; version 1 plans only have ingredients). */
  dishes?: Record<Slot, Dish>;
  /** Meals the user chose to skip today. */
  skipped?: Slot[];
  /** Dish titles replaced with "Another idea", so they aren't suggested again that day. */
  rejected?: Partial<Record<Slot, string[]>>;
  /** How many "Another idea" meals were made for this day. */
  alternatives?: number;
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
