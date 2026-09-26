import { FunctionsHttpError } from '@supabase/supabase-js';
import { z } from 'zod';

import { optional, supabase } from '@/lib/supabase';

import type { MealPlan } from '../meals/mealPlanApi';

export const AISLES = [
  'produce',
  'meat_fish',
  'dairy_eggs',
  'bakery',
  'grains_pasta',
  'canned_jars',
  'frozen',
  'nuts_seeds',
  'oils_condiments',
  'drinks',
  'other',
] as const;
export type Aisle = (typeof AISLES)[number];

/** Mirrors StoredList in supabase/functions/generate-grocery-list/handler.ts. */
const itemSchema = z.object({
  id: z.string(),
  name: z.string(),
  source: z.string(),
  grams: z.number(),
  days: z.number(),
  aisle: z.enum(AISLES).catch('other'),
  buy: z.string().nullable(),
  cost: z.number().nullable(),
});
const listSchema = z.object({
  startDate: z.string(),
  days: z.number(),
  items: z.array(itemSchema),
  estimatedCost: z.number().nullable(),
  currency: z.string(),
  checked: z.array(z.string()),
});
export type GroceryItem = z.infer<typeof itemSchema>;
export type GroceryList = z.infer<typeof listSchema>;

export async function loadGroceryList(
  userId: string,
  startDate: string,
): Promise<GroceryList | null> {
  const rows = optional(
    await supabase
      .from('grocery_lists')
      .select('start_date, days, items, estimated_cost, currency, checked')
      .eq('user_id', userId)
      .eq('start_date', startDate)
      .limit(1),
  );
  const r = rows?.[0];
  if (!r) return null;
  const parsed = listSchema.safeParse({
    startDate: r.start_date,
    days: r.days,
    items: r.items,
    estimatedCost: r.estimated_cost === null ? null : Number(r.estimated_cost),
    currency: r.currency,
    checked: r.checked,
  });
  return parsed.success ? parsed.data : null;
}

/** Stored meal plans for the given dates (missing dates are simply absent). */
export async function loadWeekPlans(userId: string, dates: string[]): Promise<MealPlan[]> {
  const rows =
    optional(
      await supabase
        .from('meal_plans')
        .select('date, meals')
        .eq('user_id', userId)
        .in('date', dates),
    ) ?? [];
  return rows
    .map((r) => r.meals as unknown as MealPlan | null)
    .filter((m): m is MealPlan => Boolean(m?.slots));
}

export type GroceryErrorCode =
  'not_configured' | 'no_plans' | 'premium_required' | 'rate_limited' | 'failed';

export class GroceryError extends Error {
  constructor(readonly code: GroceryErrorCode) {
    super(code);
  }
}

const CODES: GroceryErrorCode[] = [
  'not_configured',
  'no_plans',
  'premium_required',
  'rate_limited',
];

export async function generateGroceryList(
  startDate: string,
  regenerate: boolean,
): Promise<GroceryList> {
  const { data, error } = await supabase.functions.invoke('generate-grocery-list', {
    body: { startDate, regenerate },
  });
  if (error) {
    let code: GroceryErrorCode = 'failed';
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
      code = CODES.find((c) => c === body?.error) ?? 'failed';
    }
    throw new GroceryError(code);
  }
  const parsed = z.object({ list: listSchema }).safeParse(data);
  if (!parsed.success) throw new GroceryError('failed');
  return parsed.data.list;
}

export async function saveChecked(
  userId: string,
  startDate: string,
  checked: string[],
): Promise<void> {
  optional(
    await supabase
      .from('grocery_lists')
      .update({ checked })
      .eq('user_id', userId)
      .eq('start_date', startDate),
  );
}
