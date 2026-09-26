import { minCalories, withCalories, withWater, type CurrentPlan } from '../goals';

const plan: CurrentPlan = {
  version: 1,
  daily_calories: 1800,
  protein_g: 140,
  carbs_g: 180,
  fat_g: 60,
  fiber_g: 25,
  water_ml: 2500,
  exercise_recommendation: { sessions: [] },
  forecast: { weekly_change_kg: -0.5, weeks: 24 },
};

describe('profile goal edits', () => {
  it('uses the sex floor or BMR, whichever is higher', () => {
    expect(minCalories('female', 1350)).toBe(1350);
    expect(minCalories('female', 1100)).toBe(1200);
    expect(minCalories('male', 1400)).toBe(1500);
    expect(minCalories('unspecified', null)).toBe(1350);
  });

  it('recomputes fat, carbs, fibre and the weekly rate for a new calorie target', () => {
    const next = withCalories(plan, 2000, 1350, 2400);
    expect(next).toMatchObject({
      version: 2,
      daily_calories: 2000,
      protein_g: 140,
      fat_g: 67,
      carbs_g: 209,
      fiber_g: 28,
      water_ml: 2500,
      forecast: { weekly_change_kg: -0.364, weeks: 24 },
    });
    // Macro calories add up to the target (within rounding).
    expect(Math.abs(next.protein_g * 4 + next.carbs_g * 4 + next.fat_g * 9 - 2000)).toBeLessThan(
      10,
    );
  });

  it('refuses targets below the safety floor', () => {
    expect(() => withCalories(plan, 1300, 1350, 2400)).toThrow(RangeError);
    expect(() => withCalories(plan, 7000, 1350, 2400)).toThrow(RangeError);
  });

  it('changes only the water goal, rounded to 50 ml, within limits', () => {
    expect(withWater(plan, 2730)).toMatchObject({
      version: 2,
      water_ml: 2750,
      daily_calories: 1800,
    });
    expect(() => withWater(plan, 500)).toThrow(RangeError);
  });
});
