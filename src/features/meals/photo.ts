import type { Macros, PhotoItem } from './types';

const round1 = (n: number) => Math.round(n * 10) / 10;

/** USDA per-100 g numbers × grams (null when the item has no USDA match). */
export function photoItemMacros(item: PhotoItem, grams: number): Macros | null {
  if (!item.food) return null;
  const f = grams / 100;
  const p = item.food.per100g;
  return {
    kcal: Math.round(p.kcal * f),
    proteinG: round1(p.proteinG * f),
    carbsG: round1(p.carbsG * f),
    fatG: round1(p.fatG * f),
  };
}

export const PHOTO_GRAMS: [number, number] = [5, 2000];
