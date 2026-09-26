/** Aggregates stored meal plans into shopping ingredients (pure; unit-tested). */

import type { Aisle } from '../_prompts/grocery.v1.ts';

export interface PlanItem {
  name: string;
  foodRef: string;
  source: string;
  grams: number;
}

export interface Ingredient {
  id: string;
  name: string;
  source: string;
  grams: number;
  /** Number of planned days that use it. */
  days: number;
}

export interface GroceryItem extends Ingredient {
  aisle: Aisle;
  buy: string | null;
  cost: number | null;
}

/** Sums every planned item by its USDA reference across the given days' plans. */
export function ingredientsFrom(
  plans: { date: string; slots: Record<string, PlanItem[]> }[],
): Ingredient[] {
  const byRef = new Map<string, Ingredient & { dates: Set<string> }>();
  for (const plan of plans) {
    for (const items of Object.values(plan.slots)) {
      for (const item of items) {
        const existing = byRef.get(item.foodRef);
        if (existing) {
          existing.grams += item.grams;
          existing.dates.add(plan.date);
        } else {
          byRef.set(item.foodRef, {
            id: item.foodRef,
            name: item.name,
            source: item.source,
            grams: item.grams,
            days: 0,
            dates: new Set([plan.date]),
          });
        }
      }
    }
  }
  return [...byRef.values()]
    .map(({ dates, ...i }) => ({ ...i, grams: Math.round(i.grams), days: dates.size }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function totalCost(items: GroceryItem[]): number | null {
  const known = items.filter((i) => i.cost !== null);
  if (!known.length) return null;
  return Math.round(known.reduce((sum, i) => sum + i.cost!, 0) * 100) / 100;
}
