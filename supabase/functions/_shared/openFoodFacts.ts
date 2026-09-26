/**
 * Open Food Facts (https://world.openfoodfacts.org, ODbL licence) → the app's food shape.
 * Used for barcodes: strong on European packaged foods. Community data, so products without a
 * plausible energy value are rejected rather than guessed. Pure: the app's Jest suite tests it.
 */

import type { FoodResult, FoodServing } from './usda.ts';

export const OFF_FIELDS =
  'code,product_name,product_name_en,brands,nutriments,serving_size,serving_quantity';

export interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  nutriments?: Record<string, number | string | undefined>;
}

/** GTIN-8/12/13/14 with a valid check digit. */
export function validBarcode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.replace(/\s/g, '');
  if (!/^(\d{8}|\d{12,14})$/.test(code)) return null;
  const digits = code.split('').map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((s, d, i) => s + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check ? code : null;
}

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : v;
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null;
};
const round1 = (n: number) => Math.round(n * 10) / 10;

export function normalizeOffProduct(product: OffProduct, code: string): FoodResult | null {
  const n = product.nutriments ?? {};
  const kcal = num(n['energy-kcal_100g']) ?? (num(n['energy_100g']) ?? -1) / 4.184;
  const name = (product.product_name_en || product.product_name || '').trim();
  if (!name || kcal < 0 || kcal > 900) return null;
  const servings: FoodServing[] = [];
  const grams = num(product.serving_quantity);
  if (grams && grams > 0 && grams <= 2000) {
    const label = product.serving_size?.trim();
    servings.push({
      label: label ? `1 serving (${label})` : `1 serving (${round1(grams)} g)`,
      grams,
    });
  }
  return {
    ref: `off:${code}`,
    name: name.slice(0, 120),
    brand: product.brands?.split(',')[0]?.trim() || null,
    per100g: {
      kcal: Math.round(kcal),
      proteinG: round1(num(n['proteins_100g']) ?? 0),
      carbsG: round1(num(n['carbohydrates_100g']) ?? 0),
      fatG: round1(num(n['fat_100g']) ?? 0),
      fiberG: round1(num(n['fiber_100g']) ?? 0),
    },
    servings,
  };
}

export class OffError extends Error {
  readonly status: number | undefined;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

/** Looks up one barcode. null = unknown product or no usable nutrition data. */
export async function lookupBarcode(
  code: string,
  fetchFn: typeof fetch,
  userAgent: string,
): Promise<FoodResult | null> {
  const res = await fetchFn(
    `https://world.openfoodfacts.org/api/v2/product/${code}?fields=${OFF_FIELDS}`,
    { headers: { 'User-Agent': userAgent } },
  ).catch(() => null);
  if (!res) throw new OffError('network');
  if (res.status === 404) return null;
  if (!res.ok) throw new OffError('open food facts request failed', res.status);
  const data = (await res.json().catch(() => null)) as {
    status?: number;
    product?: OffProduct;
  } | null;
  if (!data || data.status !== 1 || !data.product) return null;
  return normalizeOffProduct(data.product, code);
}
