import { z } from 'zod';

import type { Enums, Tables } from '@/lib/supabase';

export type MealSlot = Enums<'meal_slot'>;

/** Mirrors FoodResult in supabase/functions/_shared/usda.ts; the response is validated here. */
export const foodResultSchema = z.object({
  ref: z.string(),
  name: z.string().min(1),
  brand: z.string().nullable(),
  per100g: z.object({
    kcal: z.number().min(0).max(900),
    proteinG: z.number().min(0),
    carbsG: z.number().min(0),
    fatG: z.number().min(0),
    fiberG: z.number().min(0),
  }),
  servings: z.array(z.object({ label: z.string(), grams: z.number().positive() })),
});
export const foodSearchResponseSchema = z.object({ foods: z.array(foodResultSchema) });
export type FoodResult = z.infer<typeof foodResultSchema>;

export type FoodLog = Pick<
  Tables<'food_logs'>,
  | 'id'
  | 'logged_at'
  | 'meal_slot'
  | 'food_ref'
  | 'name'
  | 'quantity'
  | 'unit'
  | 'calories'
  | 'protein_g'
  | 'carbs_g'
  | 'fat_g'
  | 'source'
>;

export interface Macros {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/**
 * Something the portion panel can scale: a database food (per 100 g, with servings) or a
 * recent log without a gram weight (scaled by portions of what was logged).
 */
export type PortionFood =
  | {
      kind: 'per100g';
      ref: string | null;
      name: string;
      brand: string | null;
      per100g: Macros;
      servings: { label: string; grams: number }[];
    }
  | {
      kind: 'portion';
      ref: string | null;
      name: string;
      brand: string | null;
      portion: Macros;
      portionLabel: string;
      /** What was logged originally, e.g. 1 × "bar"; scaled when re-logged. */
      logged: { quantity: number | null; unit: string | null };
    };

export interface NewFoodLog {
  slot: MealSlot;
  loggedAt: Date;
  name: string;
  foodRef: string | null;
  quantity: number | null;
  unit: string | null;
  macros: Macros;
  source: Enums<'food_source'>;
}
