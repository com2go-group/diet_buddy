import type { FoodResult } from '../../functions/_shared/usda';
import {
  aiPlanSchema,
  itemFor,
  pickFood,
  scaleSlot,
  totals,
} from '../../functions/generate-meal-plan/plan';

const food = (
  ref: string,
  kcal: number,
  brand: string | null = null,
  protein = 10,
): FoodResult => ({
  ref,
  name: `Food ${ref}`,
  brand,
  per100g: { kcal, proteinG: protein, carbsG: 20, fatG: 5, fiberG: 2 },
  servings: [],
});

describe('meal plan building', () => {
  it('prefers generic USDA foods over branded ones', () => {
    expect(pickFood([food('b', 100, 'Brand'), food('g', 120)])!.ref).toBe('g');
    expect(pickFood([food('b', 100, 'Brand')])!.ref).toBe('b');
    expect(pickFood([food('zero', 0)])).toBeNull();
  });

  it('computes item numbers from USDA per-100 g values, rounding grams to 5', () => {
    expect(itemFor('Oats', food('usda:1', 379, null, 13), 42)).toEqual({
      name: 'Oats',
      foodRef: 'usda:1',
      source: 'Food usda:1',
      grams: 40,
      kcal: 152,
      proteinG: 5.2,
      carbsG: 8,
      fatG: 2,
    });
  });

  it('scales a meal toward its target within realistic limits', () => {
    const items = [
      { name: 'A', food: food('a', 200), grams: 100 },
      { name: 'B', food: food('b', 100), grams: 100 },
    ];
    expect(scaleSlot(items, 450).reduce((t, i) => t + i.kcal, 0)).toBe(450);
    // A 3× shortfall is only scaled by 1.6.
    expect(scaleSlot(items, 900).map((i) => i.grams)).toEqual([160, 160]);
  });

  it('totals the day', () => {
    const a = itemFor('A', food('a', 100), 100);
    expect(totals({ breakfast: [a], lunch: [a], snack: [], dinner: [a] })).toEqual({
      kcal: 300,
      proteinG: 30,
      carbsG: 60,
      fatG: 15,
    });
  });

  it('validates the model output shape', () => {
    expect(
      aiPlanSchema.safeParse({ meals: { breakfast: [], lunch: [], snack: [], dinner: [] } })
        .success,
    ).toBe(false);
    const ok = { name: 'Oats', usda_query: 'oats', grams: 60 };
    expect(
      aiPlanSchema.safeParse({ meals: { breakfast: [ok], lunch: [ok], snack: [ok], dinner: [ok] } })
        .success,
    ).toBe(true);
  });
});
