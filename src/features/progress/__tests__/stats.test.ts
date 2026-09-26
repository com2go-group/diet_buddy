import {
  averageCalories,
  dailyCalories,
  insights,
  metricChanges,
  projection,
  trendPerWeek,
  weightSeries,
  type FoodRow,
  type MetricRow,
} from '../stats';

const NOW = new Date(2026, 8, 26, 18, 0); // Saturday
const at = (daysAgo: number, hour = 9) => new Date(2026, 8, 26 - daysAgo, hour).toISOString();
const metric = (daysAgo: number, over: Partial<MetricRow>): MetricRow => ({
  measured_at: at(daysAgo),
  weight_kg: null,
  bmi: null,
  waist_cm: null,
  body_fat_pct: null,
  ...over,
});

describe('weights', () => {
  const metrics = [
    metric(21, { weight_kg: 82, bmi: 29.1, waist_cm: 92 }),
    metric(14, { weight_kg: 81.4 }),
    metric(7, { weight_kg: 80.9 }),
    metric(0, { weight_kg: 80.6 }),
    metric(0, { weight_kg: 80.2, waist_cm: 89 }), // later the same day wins
    metric(200, { weight_kg: 90 }), // outside the window
  ];

  it('keeps one reading per day within the window', () => {
    expect(weightSeries(metrics, NOW).map((p) => p.kg)).toEqual([82, 81.4, 80.9, 80.2]);
  });

  it('fits a weekly trend over the last 28 days', () => {
    expect(trendPerWeek(weightSeries(metrics, NOW), NOW)).toBe(-0.59);
    expect(trendPerWeek(weightSeries(metrics.slice(2, 4), NOW), NOW)).toBeNull();
  });

  it('reports current values and change since the first reading', () => {
    const m = metricChanges(metrics.slice(0, 5));
    expect(m.weight_kg).toEqual({ current: 80.2, change: -1.8 });
    expect(m.waist_cm).toEqual({ current: 89, change: -3 });
    expect(m.bmi).toEqual({ current: 29.1, change: null });
    expect(m.body_fat_pct).toBeNull();
  });
});

describe('projection', () => {
  it('projects the goal date from the plan rate', () => {
    const p = projection(80.2, 70, -0.5, NOW)!;
    expect(p.weeks).toBe(21);
    expect(p.toLoseKg).toBe(10.2);
    expect(p.date.getMonth()).toBe(1); // February 2027
  });
  it('is null when the goal is reached or not a loss plan', () => {
    expect(projection(69.5, 70, -0.5, NOW)).toBeNull();
    expect(projection(80, 70, 0, NOW)).toBeNull();
  });
});

describe('calories', () => {
  const food: FoodRow[] = [
    { logged_at: at(0, 8), calories: 500, protein_g: 30 },
    { logged_at: at(0, 13), calories: 700, protein_g: 40 },
    { logged_at: at(2), calories: 1800, protein_g: 100 },
    { logged_at: at(9), calories: 2500, protein_g: 100 },
  ];
  it('totals the last 7 days, null for days without logs', () => {
    const days = dailyCalories(food, NOW);
    expect(days.map((d) => d.kcal)).toEqual([null, null, null, null, 1800, null, 1200]);
    expect(days[6]!.weekday).toBe('sat');
    expect(averageCalories(days)).toBe(1500);
    expect(averageCalories(dailyCalories([], NOW))).toBeNull();
  });
});

describe('insights', () => {
  const targets = { proteinG: 150, waterMl: 2000 };
  const days = (n: number, f: (i: number) => FoodRow[]) =>
    Array.from({ length: n }, (_, i) => f(i)).flat();

  it('needs at least 5 days of data', () => {
    expect(
      insights(
        {
          food: days(4, (i) => [{ logged_at: at(i), calories: 1800, protein_g: 80 }]),
          water: [],
          checkins: [],
        },
        targets,
        NOW,
      ),
    ).toEqual([]);
  });

  it('finds a protein gap, calorie timing and weekend difference', () => {
    const food = days(10, (i) => [
      { logged_at: at(i, 8), calories: 600, protein_g: 40 },
      { logged_at: at(i, 19), calories: [0, 6, 7].includes(i) ? 1600 : 1200, protein_g: 60 },
    ]);
    const result = insights({ food, water: [], checkins: [] }, targets, NOW);
    expect(result).toContainEqual({ kind: 'proteinGap', avg: 100, target: 150, pct: 33 });
    expect(result.find((r) => r.kind === 'calorieTiming')).toMatchObject({ pct: 31 });
    expect(result).toContainEqual({ kind: 'weekendCalories', diff: 400 });
  });

  it('compares hydration and sleep with energy', () => {
    const water = Array.from({ length: 6 }, (_, i) => ({ logged_at: at(i), ml: 1500 }));
    const checkins = [8, 8, 7, 5, 6, 5].map((sleep, i) => ({
      date: `2026-09-${20 + i}`,
      energy: sleep >= 7 ? 8 : 5,
      sleep_hours: sleep,
    }));
    const result = insights({ food: [], water, checkins }, targets, NOW);
    expect(result).toEqual([
      { kind: 'hydrationGap', avgMl: 1500, targetMl: 2000 },
      { kind: 'sleepEnergy', rested: 8, short: 5 },
    ]);
  });
});
