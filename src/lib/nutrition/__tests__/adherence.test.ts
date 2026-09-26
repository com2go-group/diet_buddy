import { adherenceScore, calorieCredit } from '../adherence';

const targets = { calories: 2000, proteinG: 150, waterMl: 2500 };
const day = { calories: 0, proteinG: 0, waterMl: 0, checkedIn: false, logged: true };

describe('calorieCredit', () => {
  it('rises to full credit at the target', () => {
    expect(calorieCredit(1000, 2000)).toBe(0.5);
    expect(calorieCredit(2000, 2000)).toBe(1);
  });

  it('keeps full credit up to 110 % and falls off after', () => {
    expect(calorieCredit(2200, 2000)).toBe(1);
    expect(calorieCredit(2600, 2000)).toBeCloseTo(0.6);
    expect(calorieCredit(3200, 2000)).toBe(0);
  });

  it('never rewards eating less than the target over hitting it', () => {
    for (const actual of [800, 1200, 1600, 1900]) {
      expect(calorieCredit(actual, 2000)).toBeLessThan(calorieCredit(2000, 2000));
    }
  });

  it('handles missing targets', () => {
    expect(calorieCredit(500, 0)).toBe(0);
  });
});

describe('adherenceScore', () => {
  it('is null when nothing was logged', () => {
    expect(adherenceScore({ ...day, logged: false }, targets)).toBeNull();
  });

  it('is 100 for a day on target', () => {
    expect(
      adherenceScore(
        { calories: 2000, proteinG: 150, waterMl: 2500, checkedIn: true, logged: true },
        targets,
      ),
    ).toBe(100);
  });

  it('weights calories 40, protein 25, water 25, check-in 10', () => {
    expect(adherenceScore({ ...day, checkedIn: true }, targets)).toBe(10);
    expect(adherenceScore({ ...day, calories: 1000 }, targets)).toBe(20);
    expect(adherenceScore({ ...day, proteinG: 75, waterMl: 1250 }, targets)).toBe(25);
  });

  it('caps protein and water at their targets', () => {
    expect(adherenceScore({ ...day, proteinG: 400, waterMl: 9000 }, targets)).toBe(50);
  });

  it('drops when calories run well over target', () => {
    const onTarget = adherenceScore({ ...day, calories: 2000 }, targets)!;
    const over = adherenceScore({ ...day, calories: 3000 }, targets)!;
    expect(over).toBeLessThan(onTarget);
  });
});
