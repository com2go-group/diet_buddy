import {
  normalizeFoods,
  parseQuery,
  tidyName,
  type FdcSearchFood,
} from '../../functions/_shared/usda';

// Trimmed from real FoodData Central /foods/search responses.
const survey: FdcSearchFood = {
  fdcId: 2344720,
  description: 'Chicken breast, baked, broiled, or roasted, skin not eaten',
  dataType: 'Survey (FNDDS)',
  foodNutrients: [
    { nutrientId: 1003, nutrientNumber: '203', unitName: 'G', value: 31 },
    { nutrientId: 1004, nutrientNumber: '204', unitName: 'G', value: 3.57 },
    { nutrientId: 1005, nutrientNumber: '205', unitName: 'G', value: 0 },
    { nutrientId: 1008, nutrientNumber: '208', unitName: 'KCAL', value: 165 },
    { nutrientId: 1079, nutrientNumber: '291', unitName: 'G', value: 0 },
  ],
  foodMeasures: [
    { disseminationText: '1 small breast', gramWeight: 118 },
    { disseminationText: 'Quantity not specified', gramWeight: 140 },
    { disseminationText: '1 oz, cooked', gramWeight: 28.35 },
  ],
};
const foundation: FdcSearchFood = {
  fdcId: 1750340,
  description: 'Apples, fuji, with skin, raw',
  dataType: 'Foundation',
  foodNutrients: [
    { nutrientId: 1003, unitName: 'G', value: 0.148 },
    { nutrientId: 1005, unitName: 'G', value: 15.7 },
    { nutrientId: 2047, nutrientNumber: '957', unitName: 'KCAL', value: 63.7 },
  ],
};
const branded: FdcSearchFood = {
  fdcId: 2032001,
  description: 'GREEK YOGURT, PLAIN',
  dataType: 'Branded',
  brandOwner: 'Fage USA Dairy Industry, Inc.',
  brandName: 'FAGE',
  servingSize: 170,
  servingSizeUnit: 'GRM',
  householdServingFullText: '1 container',
  foodNutrients: [
    { nutrientId: 1003, unitName: 'G', value: 10 },
    { nutrientId: 1004, unitName: 'G', value: 0 },
    { nutrientId: 1005, unitName: 'G', value: 3.53 },
    { nutrientId: 1008, unitName: 'KCAL', value: 53 },
  ],
};

describe('normalizeFoods', () => {
  it('maps nutrients per 100 g and household measures', () => {
    const [chicken] = normalizeFoods([survey]);
    expect(chicken).toEqual({
      ref: 'usda:2344720',
      name: 'Chicken breast, baked, broiled, or roasted, skin not eaten',
      brand: null,
      per100g: { kcal: 165, proteinG: 31, carbsG: 0, fatG: 3.6, fiberG: 0 },
      servings: [
        { label: '1 small breast (118 g)', grams: 118 },
        { label: '1 oz, cooked (28.4 g)', grams: 28.35 },
      ],
    });
  });

  it('uses Atwater energy for Foundation foods and 0 for missing macros', () => {
    const [apple] = normalizeFoods([foundation]);
    expect(apple!.per100g).toEqual({ kcal: 64, proteinG: 0.1, carbsG: 15.7, fatG: 0, fiberG: 0 });
  });

  it('tidies branded names and adds the label serving', () => {
    const [yogurt] = normalizeFoods([branded]);
    expect(yogurt!.name).toBe('Greek yogurt, plain');
    expect(yogurt!.brand).toBe('FAGE');
    expect(yogurt!.servings).toEqual([{ label: '1 container (170 g)', grams: 170 }]);
  });

  it('converts kJ-only energy to kcal', () => {
    const [food] = normalizeFoods([
      {
        fdcId: 1,
        description: 'Oats',
        foodNutrients: [{ nutrientId: 1008, unitName: 'kJ', value: 1582 }],
      },
    ]);
    expect(food!.per100g.kcal).toBe(378);
  });

  it('drops foods without energy or with implausible values', () => {
    expect(
      normalizeFoods([
        { fdcId: 1, description: 'Water', foodNutrients: [] },
        { fdcId: 2, description: 'Bad', foodNutrients: [{ nutrientId: 1008, value: 4000 }] },
        { fdcId: 3, description: 'Negative', foodNutrients: [{ nutrientId: 1008, value: -1 }] },
      ]),
    ).toEqual([]);
  });
});

describe('tidyName / parseQuery', () => {
  it('keeps mixed-case names', () => expect(tidyName('Banana, raw')).toBe('Banana, raw'));
  it('validates the query', () => {
    expect(parseQuery('  chicken   breast ')).toBe('chicken breast');
    expect(parseQuery('a')).toBeNull();
    expect(parseQuery('x'.repeat(101))).toBeNull();
    expect(parseQuery(42)).toBeNull();
  });
});
