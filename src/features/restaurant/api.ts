import { FunctionsHttpError } from '@supabase/supabase-js';
import { z } from 'zod';

import { supabase } from '@/lib/supabase';

import type { MealSlot } from '../meals/types';

/** Mirrors the analyze-menu response; validated here. */
const dishSchema = z.object({
  name: z.string(),
  ingredients: z.array(
    z.object({ name: z.string(), grams: z.number(), source: z.string().nullable() }),
  ),
  estimate: z
    .object({ kcal: z.number(), proteinG: z.number(), carbsG: z.number(), fatG: z.number() })
    .nullable(),
  score: z.number(),
  warnings: z.array(z.string()),
});
const responseSchema = z.object({
  dishes: z.array(dishSchema),
  budget: z.object({ kcal: z.number(), proteinG: z.number() }),
});
export type Dish = z.infer<typeof dishSchema>;
export type MenuResult = z.infer<typeof responseSchema>;

export type MenuErrorCode =
  'not_configured' | 'premium_required' | 'rate_limited' | 'invalid_image' | 'failed';

export class MenuError extends Error {
  constructor(readonly code: MenuErrorCode) {
    super(code);
  }
}

const CODES: MenuErrorCode[] = [
  'not_configured',
  'premium_required',
  'rate_limited',
  'invalid_image',
];

export async function analyzeMenu(
  input: { image: string } | { dishes: string },
  slot: MealSlot,
  now: Date,
): Promise<MenuResult> {
  const { data, error } = await supabase.functions.invoke('analyze-menu', {
    body: { ...input, slot, tzOffsetMinutes: -now.getTimezoneOffset() },
  });
  if (error) {
    let code: MenuErrorCode = 'failed';
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
      code = CODES.find((c) => c === body?.error) ?? 'failed';
    }
    throw new MenuError(code);
  }
  const parsed = responseSchema.safeParse(data);
  if (!parsed.success) throw new MenuError('failed');
  return parsed.data;
}

/** The meal someone is most likely eating out now. */
export function currentSlot(now: Date): MealSlot {
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes < 10 * 60 + 30) return 'breakfast';
  if (minutes < 15 * 60) return 'lunch';
  if (minutes < 17 * 60 + 30) return 'snack';
  return 'dinner';
}
