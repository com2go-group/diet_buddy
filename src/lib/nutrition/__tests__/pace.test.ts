import {
  addWeeks,
  dailyDeficitForWeeklyKg,
  maxWeeklyLossKg,
  requestedWeeklyKg,
  requiredWeeklyKg,
  weeklyKgForDailyDeficit,
  weeksToGoal,
} from '../pace';

describe('dailyDeficitForWeeklyKg', () => {
  // CLAUDE.md §8. Fixes prototype bug 2 (fixed 250/500/750 deficits).
  it.each([
    [0.25, 275],
    [0.5, 550],
    [0.75, 825],
    [1.0, 1100],
  ])('%p kg/week needs %p kcal/day', (kg, kcal) => {
    expect(dailyDeficitForWeeklyKg(kg)).toBeCloseTo(kcal);
  });

  it('round-trips', () => {
    expect(weeklyKgForDailyDeficit(dailyDeficitForWeeklyKg(0.63))).toBeCloseTo(0.63);
  });
});

describe('requestedWeeklyKg', () => {
  it('uses fixed rates for sustainable and balanced', () => {
    expect(requestedWeeklyKg('sustainable', 90)).toBe(0.25);
    expect(requestedWeeklyKg('balanced', 90)).toBe(0.5);
  });

  it('scales fast within 0.75–1.0 kg/week', () => {
    expect(requestedWeeklyKg('fast', 60)).toBe(0.75);
    expect(requestedWeeklyKg('fast', 85)).toBeCloseTo(0.85);
    expect(requestedWeeklyKg('fast', 140)).toBe(1.0);
  });
});

describe('maxWeeklyLossKg', () => {
  it('is 1 % of body weight', () => {
    expect(maxWeeklyLossKg(72)).toBeCloseTo(0.72);
  });
});

describe('weeksToGoal', () => {
  it('divides kg by weekly rate, rounding up', () => {
    expect(weeksToGoal(10, 0.5)).toBe(20);
    expect(weeksToGoal(10, 0.3)).toBe(34);
  });

  it('does not add a week for floating-point noise', () => {
    expect(weeksToGoal(0.3, 0.1)).toBe(3);
  });

  it('returns null when there is nothing to plan', () => {
    expect(weeksToGoal(0, 0.5)).toBeNull();
    expect(weeksToGoal(5, 0)).toBeNull();
  });

  // Prototype bug 1 treated the daily deficit / 7700 as kg per week, giving ~7× longer timelines.
  it('is not 7× too long for a 500 kcal/day deficit', () => {
    const weekly = weeklyKgForDailyDeficit(500);
    expect(weeksToGoal(7, weekly)).toBe(16);
  });
});

describe('requiredWeeklyKg', () => {
  it('computes the rate needed for a goal date', () => {
    expect(requiredWeeklyKg(6, 12)).toBe(0.5);
    expect(requiredWeeklyKg(-2, 12)).toBe(0);
  });
});

describe('addWeeks', () => {
  it('adds whole weeks without mutating', () => {
    const start = new Date(2026, 0, 1);
    expect(addWeeks(start, 2)).toEqual(new Date(2026, 0, 15));
    expect(start).toEqual(new Date(2026, 0, 1));
  });
});
