import { FunctionsHttpError } from '@supabase/supabase-js';
import { z } from 'zod';

import { supabase } from '@/lib/supabase';

import { foodResultSchema, type FoodResult } from './types';

export type BarcodeErrorCode = 'not_found' | 'invalid_barcode' | 'failed';

export class BarcodeError extends Error {
  constructor(readonly code: BarcodeErrorCode) {
    super(code);
  }
}

/** GTIN-8/12/13/14 with a valid check digit (mirrors supabase/functions/_shared/openFoodFacts.ts). */
export function isValidBarcode(raw: string): boolean {
  const code = raw.replace(/\s/g, '');
  if (!/^(\d{8}|\d{12,14})$/.test(code)) return false;
  const digits = code.split('').map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((s, d, i) => s + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

/** Product lookup through the food-barcode Edge Function (Open Food Facts). */
export async function lookupBarcode(barcode: string): Promise<FoodResult> {
  const { data, error } = await supabase.functions.invoke('food-barcode', {
    body: { barcode: barcode.replace(/\s/g, '') },
  });
  if (error) {
    let code: BarcodeErrorCode = 'failed';
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
      if (body?.error === 'not_found' || body?.error === 'invalid_barcode') code = body.error;
    }
    throw new BarcodeError(code);
  }
  const parsed = z.object({ food: foodResultSchema }).safeParse(data);
  if (!parsed.success) throw new BarcodeError('failed');
  return parsed.data.food;
}
