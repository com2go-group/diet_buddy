import {
  gramsFor,
  logTimeFor,
  macrosFor,
  portionQuantity,
  recentFoods,
  slotTarget,
  totals,
} from '../portion';
import type { FoodLog, PortionFood } from '../types';

const chicken: PortionFood = {
  kind: 'per100g',
  ref: 'usda:1',
  name: 'Chicken breast',
  brand: null,
  per100g: { kcal: 165, proteinG: 31, carbsG: 0, fatG: 3.6 },
  servings: [{ label: '1 small breast (118 g)', grams: 118 }],
};

const log = (over: Partial<FoodLog>): FoodLog => ({
  id: 'x',
  logged_at: '2026-09-26T08:00:00Z',
  meal_slot: 'breakfast',
  food_ref: null,
  name: 'Food',
  quantity: null,
  unit: null,
  calories: 100,
  protein_g: 1,
  carbs_g: 2,
  fat_g: 3,
  source: 'manual',
  ...over,
});

describe('portions', () => {
  it('scales per-100 g values by grams or servings', () => {
    expect(macrosFor(chicken, 150, 'g')).toEqual({
      kcal: 248,
      proteinG: 46.5,
      carbsG: 0,
      fatG: 5.4,
    });
    expect(macrosFor(chicken, 2, 0)).toEqual({ kcal: 389, proteinG: 73.2, carbsG: 0, fatG: 8.5 });
    expect(gramsFor(chicken, 2, 0)).toBe(236);
    expect(gramsFor(chicken, 80, 'g')).toBe(80);
  });

  it('scales portion foods by count', () => {
    const bar: PortionFood = {
      kind: 'portion',
      ref: null,
      name: 'Protein bar',
      brand: null,
      portion: { kcal: 210, proteinG: 20, carbsG: 22, fatG: 7 },
      portionLabel: '1 bar',
      logged: { quantity: 1, unit: 'bar' },
    };
    expect(macrosFor(bar, 1.5, 'portion')).toEqual({
      kcal: 315,
      proteinG: 30,
      carbsG: 33,
      fatG: 10.5,
    });
    expect(gramsFor(bar, 1, 'portion')).toBeNull();
    expect(portionQuantity(bar, 2)).toEqual({ quantity: 2, unit: 'bar' });
    const soup = { ...bar, logged: { quantity: null, unit: null } };
    expect(portionQuantity(soup, 1)).toEqual({ quantity: null, unit: null });
    expect(portionQuantity(soup, 1.5)).toEqual({ quantity: 1.5, unit: 'portion' });
  });

  it('splits the daily target across meals, rounded to 10 kcal', () => {
    expect([
      slotTarget(1800, 'breakfast'),
      slotTarget(1800, 'lunch'),
      slotTarget(1800, 'snack'),
      slotTarget(1800, 'dinner'),
    ]).toEqual([450, 540, 180, 630]);
  });

  it('logs today at the current time and earlier days at the meal’s usual time', () => {
    const now = new Date(2026, 8, 26, 21, 15);
    expect(logTimeFor(new Date(2026, 8, 26), 'lunch', now)).toBe(now);
    const earlier = logTimeFor(new Date(2026, 8, 24), 'dinner', now);
    expect([earlier.getDate(), earlier.getHours(), earlier.getMinutes()]).toEqual([24, 19, 0]);
  });

  it('totals logs', () => {
    expect(
      totals([log({ calories: 100.4, protein_g: 1.25 }), log({ calories: 50, protein_g: 2 })]),
    ).toEqual({
      kcal: 150,
      proteinG: 3.3,
      carbsG: 4,
      fatG: 6,
    });
  });

  it('builds recent foods: newest per name, grams become per-100 g again', () => {
    const recent = recentFoods([
      log({
        name: 'Oats',
        unit: 'g',
        quantity: 50,
        calories: 190,
        protein_g: 6.5,
        carbs_g: 33,
        fat_g: 3.5,
        logged_at: '2026-09-25T08:00:00Z',
      }),
      log({
        name: 'oats',
        unit: 'g',
        quantity: 40,
        calories: 152,
        logged_at: '2026-09-20T08:00:00Z',
      }),
      log({
        name: 'Protein bar',
        quantity: 1,
        unit: 'bar',
        calories: 210,
        logged_at: '2026-09-24T15:00:00Z',
      }),
      log({ name: 'Homemade soup', calories: 320, logged_at: '2026-09-23T19:00:00Z' }),
    ]);
    expect(recent.map((f) => f.name)).toEqual(['Oats', 'Protein bar', 'Homemade soup']);
    expect(recent[0]).toMatchObject({
      kind: 'per100g',
      per100g: { kcal: 380, proteinG: 13, carbsG: 66, fatG: 7 },
    });
    expect(recent[1]).toMatchObject({ kind: 'portion', portionLabel: '1 bar' });
    expect(recent[2]).toMatchObject({ kind: 'portion', portionLabel: '320 kcal' });
  });
});
