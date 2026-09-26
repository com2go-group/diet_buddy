import { findViolations, type DietPrefs } from '../../functions/_shared/dietRules';

const none: DietPrefs = {
  dietStyles: [],
  restrictions: [],
  restrictionOther: null,
  allergies: [],
  allergyOther: null,
  avoidFoods: [],
};
const item = (name: string, source = name, slot = 'lunch') => ({ slot, name, source });
const reasons = (prefs: Partial<DietPrefs>, ...items: ReturnType<typeof item>[]) =>
  findViolations(items, { ...none, ...prefs }).map((v) => `${v.name}:${v.reason}`);

describe('diet rules', () => {
  it('catches allergens in names and USDA descriptions', () => {
    expect(
      reasons(
        { allergies: ['peanuts'] },
        item('Satay chicken skewers'),
        item('Energy bar', 'Snacks, granola bar, with peanuts'),
      ),
    ).toEqual(['Satay chicken skewers:allergy:peanuts', 'Energy bar:allergy:peanuts']);
    expect(
      reasons(
        { allergies: ['tree_nuts'] },
        item('Greek yogurt with walnuts'),
        item('Coconut chia pudding'),
      ),
    ).toEqual(['Greek yogurt with walnuts:allergy:tree_nuts']);
    expect(reasons({ allergies: ['shellfish'] }, item('Garlic prawns'))).toEqual([
      'Garlic prawns:allergy:shellfish',
    ]);
    expect(reasons({ allergies: ['sesame'] }, item('Hummus and carrots'))).toEqual([
      'Hummus and carrots:allergy:sesame',
    ]);
    expect(reasons({ allergies: ['wheat_gluten'] }, item('Wholegrain toast'))).toEqual([
      'Wholegrain toast:allergy:wheat_gluten',
    ]);
  });

  it('matches whole words only (no false alarms on butternut, eggplant, coconut)', () => {
    expect(
      reasons(
        { allergies: ['dairy', 'eggs', 'tree_nuts'] },
        item('Roasted butternut squash'),
        item('Grilled eggplant'),
        item('Coconut water'),
      ),
    ).toEqual([]);
  });

  it('allows plant-based milks for dairy-free and vegan, but still checks the plant', () => {
    expect(reasons({ allergies: ['dairy'] }, item('Oats with oat milk'))).toEqual([]);
    expect(reasons({ dietStyles: ['vegan'] }, item('Smoothie with soy milk'))).toEqual([]);
    expect(
      reasons({ allergies: ['dairy', 'tree_nuts'] }, item('Porridge with almond milk')),
    ).toEqual(['Porridge with almond milk:allergy:tree_nuts']);
  });

  it('enforces diet styles and restrictions', () => {
    expect(
      reasons(
        { dietStyles: ['vegetarian'] },
        item('Chicken salad'),
        item('Lentil soup'),
        item('Tuna wrap'),
      ),
    ).toEqual(['Chicken salad:diet:vegetarian', 'Tuna wrap:diet:vegetarian']);
    expect(reasons({ dietStyles: ['vegan'] }, item('Scrambled eggs'), item('Honey oats'))).toEqual([
      'Scrambled eggs:diet:vegan',
      'Honey oats:diet:vegan',
    ]);
    expect(
      reasons({ restrictions: ['halal'] }, item('Bacon sandwich'), item('Beef stew with red wine')),
    ).toEqual(['Bacon sandwich:restriction:halal', 'Beef stew with red wine:restriction:halal']);
  });

  it('flags meat with dairy in one kosher meal', () => {
    expect(
      reasons(
        { restrictions: ['kosher'] },
        item('Beef burger', 'Beef', 'dinner'),
        item('Cheddar slice', 'Cheese, cheddar', 'dinner'),
      ),
    ).toEqual(['Beef burger + Cheddar slice:restriction:kosher_mixing']);
    expect(
      reasons(
        { restrictions: ['kosher'] },
        item('Beef burger', 'Beef', 'lunch'),
        item('Yogurt', 'Yogurt', 'snack'),
      ),
    ).toEqual([]);
  });

  it('uses avoided foods and free-text allergies', () => {
    expect(
      reasons(
        { avoidFoods: ['tuna', 'mushrooms', 'ice_cream'] },
        item('Mushroom risotto'),
        item('Vanilla ice cream'),
        item('Salmon'),
      ),
    ).toEqual(['Mushroom risotto:avoid:mushrooms', 'Vanilla ice cream:avoid:ice_cream']);
    expect(
      reasons(
        { allergyOther: 'Kiwi and strawberries' },
        item('Fruit salad with strawberry'),
        item('Kiwis'),
      ),
    ).toEqual(['Fruit salad with strawberry:allergy:other', 'Kiwis:allergy:other']);
  });
});
