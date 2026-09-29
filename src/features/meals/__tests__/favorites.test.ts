import { copyOfMeal } from '../copyYesterday';
import { favoriteKey, loadFavorites } from '../favorites';
import type { FoodLog } from '../types';

const mockRows = jest.fn();
jest.mock('@/lib/supabase', () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: async () => ({ data: mockRows(), error: null }),
  };
  return { ...jest.requireActual('@/lib/supabase/result'), supabase: { from: () => chain } };
});

const oats = {
  kind: 'per100g' as const,
  ref: 'usda:1',
  name: 'Rolled oats',
  brand: null,
  per100g: { kcal: 379, proteinG: 13, carbsG: 68, fatG: 6.5 },
  servings: [{ label: '1 cup', grams: 81 }],
};

describe('favourites', () => {
  it('matches foods by database reference, else by name', () => {
    expect(favoriteKey(oats)).toBe('usda:1');
    expect(favoriteKey({ ref: null, name: ' Mum’s Stew ' })).toBe('mum’s stew');
  });

  it('loads saved foods and skips rows in an unknown shape', async () => {
    mockRows.mockReturnValue([
      { id: 'a', food: oats },
      { id: 'b', food: { kind: 'mystery' } },
    ]);
    expect(await loadFavorites('u1')).toEqual([{ id: 'a', food: oats }]);
  });
});

describe('same as yesterday', () => {
  const log = (slot: FoodLog['meal_slot'], name: string, source: FoodLog['source']): FoodLog => ({
    id: name,
    logged_at: '2026-09-28T07:30:00Z',
    meal_slot: slot,
    food_ref: `ref:${name}`,
    name,
    quantity: 80,
    unit: 'g',
    calories: 300,
    protein_g: 10,
    carbs_g: 50,
    fat_g: 5,
    source,
  });

  it('copies one meal’s foods with their amounts and numbers', () => {
    const now = new Date('2026-09-29T08:00:00');
    const copies = copyOfMeal(
      [
        log('breakfast', 'Oats', 'search'),
        log('lunch', 'Soup', 'search'),
        log('breakfast', 'Bowl', 'plan'),
      ],
      'breakfast',
      now,
      now,
    );
    expect(copies).toHaveLength(2);
    expect(copies[0]).toMatchObject({
      slot: 'breakfast',
      name: 'Oats',
      foodRef: 'ref:Oats',
      quantity: 80,
      unit: 'g',
      macros: { kcal: 300, proteinG: 10, carbsG: 50, fatG: 5 },
      source: 'search',
      loggedAt: now,
    });
    // A planned meal eaten again today isn't from today's plan.
    expect(copies[1]!.source).toBe('manual');
  });
});
