import { forecastCurve, forecastMilestones } from '../forecast';

const START = new Date(2026, 8, 26);

describe('forecastMilestones', () => {
  it('gives first kg, halfway and goal at the plan’s weekly rate', () => {
    const m = forecastMilestones(82, 70, 0.5, START);
    expect(m.map((x) => [x.kind, x.lostKg, x.weightKg, x.weeks])).toEqual([
      ['first_kg', 1, 81, 2],
      ['halfway', 6, 76, 12],
      ['goal', 12, 70, 24],
    ]);
    expect(m[2]!.date).toEqual(new Date(2027, 2, 13));
  });

  it('drops milestones that coincide with a later one', () => {
    // 2 kg at 0.7 kg/week: the first kg and halfway are both 1 kg (week 2), the goal is week 3.
    const m = forecastMilestones(72, 70, 0.7, START);
    expect(m.map((x) => [x.kind, x.weeks])).toEqual([
      ['halfway', 2],
      ['goal', 3],
    ]);
  });

  it('is empty when no loss is planned', () => {
    expect(forecastMilestones(70, 70, 0.5, START)).toEqual([]);
    expect(forecastMilestones(82, 70, 0, START)).toEqual([]);
  });
});

describe('forecastCurve', () => {
  it('steps weekly from start to goal without overshooting', () => {
    const c = forecastCurve(72, 70, 0.75);
    expect(c).toEqual([72, 71.25, 70.5, 70]);
  });

  it('is flat without a planned loss', () => {
    expect(forecastCurve(70, 75, 0.5)).toEqual([70]);
  });
});
