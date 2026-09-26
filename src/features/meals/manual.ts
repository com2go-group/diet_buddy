import { z } from 'zod';

import type { StringKey } from '@/i18n';

/** Manual entry: the user's own numbers (e.g. from a pack label). */
export const manualFoodSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: 'authErrors.required' satisfies StringKey })
    .max(200),
  quantity: z.number().min(0.01).max(100000).nullable(),
  unit: z.string().trim().max(32),
  calories: z
    .number({ message: 'authErrors.required' satisfies StringKey })
    .min(0)
    .max(10000),
  proteinG: z.number().min(0).max(1000).nullable(),
  carbsG: z.number().min(0).max(1000).nullable(),
  fatG: z.number().min(0).max(1000).nullable(),
});

export interface ManualFood {
  name: string;
  quantity: number | null;
  unit: string;
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
}
export type ManualValue = Omit<ManualFood, 'calories'> & { calories: number };
export type ManualField = keyof ManualFood;

export const EMPTY_MANUAL: ManualFood = {
  name: '',
  quantity: null,
  unit: '',
  calories: null,
  proteinG: null,
  carbsG: null,
  fatG: null,
};

export const MANUAL_RANGES: Record<Exclude<ManualField, 'name' | 'unit'>, [number, number]> = {
  quantity: [0.01, 100000],
  calories: [0, 10000],
  proteinG: [0, 1000],
  carbsG: [0, 1000],
  fatG: [0, 1000],
};

/** Field → error message key (required) or range, for fields that fail validation. */
export function validateManual(
  input: ManualFood,
):
  | { ok: true; value: z.output<typeof manualFoodSchema> }
  | { ok: false; errors: Partial<Record<ManualField, string>> } {
  const result = manualFoodSchema.safeParse(input);
  if (result.success) return { ok: true, value: result.data };
  const errors: Partial<Record<ManualField, string>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as ManualField;
    if (errors[field]) continue;
    if (field === 'name' || (field === 'calories' && input.calories === null)) {
      errors[field] = 'authErrors.required';
    } else if (field !== 'unit') {
      const [min, max] = MANUAL_RANGES[field];
      errors[field] = `range:${min}:${max}`;
    }
  }
  return { ok: false, errors };
}
