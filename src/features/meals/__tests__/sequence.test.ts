import type { MealPlan } from '../mealPlanApi';
import {
  adaptFactor,
  adaptItem,
  currentSlot,
  isAdjusted,
  previousSlot,
  slotDone,
  slotStates,
} from '../sequence';
import type { FoodLog } from '../types';

const item = (name: string, kcal: number, grams = 100) => ({
  name,
  foodRef: `usda:${name}`,
  source: name,
  grams,
  kcal,
  proteinG: 20,
  carbsG: 30,
  fatG: 10,
});
const plan: MealPlan = {
  date: '2026-09-28',
  slots: {
    breakfast: [item('Oats', 400), item('Berries', 100)],
    lunch: [item('Chicken', 600)],
    snack: [item('Apple', 200)],
    dinner: [item('Lentils', 700)],
  },
  totals: { kcal: 2000, proteinG: 100, carbsG: 150, fatG: 50 },
};
const log = (
  slot: FoodLog['meal_slot'],
  calories: number,
  source: FoodLog['source'] = 'plan',
  foodRef: string | null = null,
) => ({ meal_slot: slot, calories, source, food_ref: foodRef });

describe('meal sequence', () => {
  it('starts at breakfast with everything after it locked', () => {
    expect(currentSlot(plan, [])).toBe('breakfast');
    expect(slotStates(plan, [])).toEqual({
      breakfast: 'current',
      lunch: 'locked',
      snack: 'locked',
      dinner: 'locked',
    });
  });

  it('moves on once something from the plan is logged for the meal (even after a new plan)', () => {
    const logs = [log('breakfast', 400, 'plan', 'usda:Oats')];
    expect(slotDone(plan, logs, 'breakfast')).toBe(true);
    expect(slotStates(plan, logs)).toMatchObject({ breakfast: 'done', lunch: 'current' });
  });

  it('does not unlock the next meal for food logged another way', () => {
    const logs = [log('breakfast', 400, 'search', 'usda:Croissant')];
    expect(currentSlot(plan, logs)).toBe('breakfast');
    // A plan log in another meal doesn't count for breakfast either.
    expect(currentSlot(plan, [log('lunch', 600, 'plan', 'usda:Chicken')])).toBe('breakfast');
  });

  it('treats a meal with no planned items as done, and ends the day after dinner', () => {
    const noSnack = { ...plan, slots: { ...plan.slots, snack: [] } };
    const logs = [
      log('breakfast', 400, 'plan', 'usda:Oats'),
      log('lunch', 600, 'plan', 'usda:Chicken'),
    ];
    expect(currentSlot(noSnack, logs)).toBe('dinner');
    expect(currentSlot(noSnack, [...logs, log('dinner', 700, 'plan', 'usda:Lentils')])).toBeNull();
  });

  it('names the meal before this one', () => {
    expect(previousSlot('lunch')).toBe('breakfast');
    expect(previousSlot('breakfast')).toBeNull();
  });
});

describe('adapting the next meal', () => {
  it('keeps the plan when the day is on track', () => {
    expect(adaptFactor(plan, [log('breakfast', 500, 'plan', 'usda:Oats')], 2000)).toBe(1);
  });

  it('shrinks the remaining meals after a bigger meal, never below the minimum', () => {
    // 900 kcal eaten at breakfast leaves 1100 for 1500 planned → 0.73.
    const logs = [log('breakfast', 400, 'plan', 'usda:Oats'), log('breakfast', 500, 'search')];
    expect(adaptFactor(plan, logs, 2000)).toBe(0.73);
    expect(adaptFactor(plan, [log('breakfast', 1900, 'plan', 'usda:Oats')], 2000)).toBe(0.6);
  });

  it('grows them when less was eaten, up to the maximum', () => {
    const logs = [log('breakfast', 200, 'plan', 'usda:Oats')];
    expect(adaptFactor(plan, logs, 2000)).toBe(1.2);
    expect(adaptFactor(plan, logs, 5000)).toBe(1.6);
  });

  it('counts extras logged in the current meal', () => {
    const logs = [log('breakfast', 400, 'plan', 'usda:Oats'), log('lunch', 300, 'manual')];
    // 700 eaten, 1300 left for lunch+snack+dinner (1500 planned).
    expect(adaptFactor(plan, logs, 2000)).toBe(0.87);
  });

  it('does nothing without a target', () => {
    expect(adaptFactor(plan, [], null)).toBe(1);
  });

  it('scales grams to the nearest 5 g and the USDA numbers with them', () => {
    expect(adaptItem(item('Chicken', 600, 150), 0.73)).toMatchObject({
      grams: 110,
      kcal: 440,
      proteinG: 14.7,
      carbsG: 22,
      fatG: 7.3,
    });
    expect(adaptItem(item('Chicken', 600, 150), 1)).toEqual(item('Chicken', 600, 150));
    expect(adaptItem(item('Salt', 5, 3), 0.6).grams).toBe(5);
  });

  it('shows an adjustment only when it is noticeable', () => {
    expect(isAdjusted(0.97)).toBe(false);
    expect(isAdjusted(0.9)).toBe(true);
  });
});
