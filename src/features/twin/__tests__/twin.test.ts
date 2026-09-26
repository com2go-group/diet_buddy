import { estimateBodyFatPct } from '@/lib/nutrition';

import {
  defaultLook,
  fullness,
  MAX_MONTH_FRAMES,
  parseLook,
  twinFrames,
  type MetricPoint,
  type TwinInput,
} from '../twin';

const now = new Date(2026, 8, 26, 12);
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 9).toISOString();
const base: TwinInput = {
  metrics: [],
  sex: 'male',
  heightCm: 180,
  birthDate: new Date(1990, 3, 12),
  goal: null,
  weeklyChangeKg: null,
  now,
};
const point = (iso: string, weight: number | null, fat: number | null = null): MetricPoint => ({
  measured_at: iso,
  weight_kg: weight,
  body_fat_pct: fat,
});

describe('look', () => {
  it('defaults the variant from the gender', () => {
    expect(defaultLook('female').variant).toBe('female');
    expect(defaultLook('unspecified').variant).toBe('other');
    expect(defaultLook(null).variant).toBe('other');
  });

  it('keeps valid stored values and replaces invalid ones', () => {
    expect(parseLook({ variant: 'other', skin: 5, hair: 0 }, 'male')).toEqual({
      variant: 'other',
      skin: 5,
      hair: 0,
    });
    expect(parseLook({ variant: 'robot', skin: 9, hair: 1.5 }, 'male')).toEqual(
      defaultLook('male'),
    );
    expect(parseLook(null, 'female')).toEqual(defaultLook('female'));
    expect(parseLook('x', 'female')).toEqual(defaultLook('female'));
  });
});

describe('fullness', () => {
  it('maps the variant range to 0–1 and clamps outside it', () => {
    expect(fullness(10, 'male')).toBe(0);
    expect(fullness(25, 'male')).toBeCloseTo(0.5);
    expect(fullness(40, 'male')).toBe(1);
    expect(fullness(3, 'male')).toBe(0);
    expect(fullness(70, 'female')).toBe(1);
    expect(fullness(33, 'female')).toBeCloseTo(0.5);
    expect(fullness(29, 'other')).toBeCloseTo(0.5);
  });
});

describe('twinFrames', () => {
  it('is empty without a weigh-in', () => {
    expect(twinFrames({ ...base, metrics: [point(at(2026, 9, 1), null, 20)] })).toEqual([]);
  });

  it('shows one weigh-in as "now", with estimated body fat', () => {
    const frames = twinFrames({ ...base, metrics: [point(at(2026, 9, 20), 84)] });
    expect(frames).toHaveLength(1);
    expect(frames[0]).toMatchObject({ kind: 'now', date: '2026-09-20', weightKg: 84 });
    expect(frames[0]!.estimatedFat).toBe(true);
    const expected = estimateBodyFatPct({ sex: 'male', ageYears: 36, heightCm: 180, weightKg: 84 });
    expect(frames[0]!.bodyFatPct).toBeCloseTo(expected, 1);
  });

  it('uses measured body fat when present', () => {
    const [frame] = twinFrames({ ...base, metrics: [point(at(2026, 9, 20), 84, 22.4)] });
    expect(frame).toMatchObject({ bodyFatPct: 22.4, estimatedFat: false });
  });

  it('adds start, the last weigh-in of each month in between, and now', () => {
    const frames = twinFrames({
      ...base,
      metrics: [
        point(at(2026, 6, 3), 90),
        point(at(2026, 6, 20), 89),
        point(at(2026, 7, 5), 88),
        point(at(2026, 7, 28), 87),
        point(at(2026, 8, 30), 86),
        point(at(2026, 9, 2), 85.5),
        point(at(2026, 9, 25), 85),
      ],
    });
    expect(frames.map((f) => [f.kind, f.weightKg])).toEqual([
      ['start', 90],
      ['month', 87],
      ['month', 86],
      ['now', 85],
    ]);
  });

  it('sorts unsorted rows and caps the monthly frames', () => {
    const metrics = Array.from({ length: 30 }, (_, i) =>
      point(new Date(2024, i, 15).toISOString(), 100 - i * 0.5),
    ).reverse();
    const frames = twinFrames({ ...base, metrics });
    expect(frames[0]).toMatchObject({ kind: 'start', weightKg: 100 });
    expect(frames.at(-1)).toMatchObject({ kind: 'now', weightKg: 85.5 });
    expect(frames.filter((f) => f.kind === 'month')).toHaveLength(MAX_MONTH_FRAMES);
  });

  it('projects the goal on the goal date, never below a healthy body-fat level', () => {
    const frames = twinFrames({
      ...base,
      metrics: [point(at(2026, 9, 20), 84)],
      goal: { goalKg: 60, goalDate: '2027-06-01' },
    });
    const goal = frames.at(-1)!;
    expect(goal).toMatchObject({ kind: 'goal', weightKg: 60, date: '2027-06-01' });
    expect(goal.bodyFatPct).toBeGreaterThanOrEqual(10);
  });

  it('carries a measured body-fat offset into the goal', () => {
    const measured = twinFrames({
      ...base,
      metrics: [point(at(2026, 9, 20), 84, 18)],
      goal: { goalKg: 78, goalDate: null },
    });
    const estimated = twinFrames({
      ...base,
      metrics: [point(at(2026, 9, 20), 84)],
      goal: { goalKg: 78, goalDate: null },
    });
    const gap = measured[0]!.bodyFatPct - estimated[0]!.bodyFatPct;
    expect(measured[1]!.bodyFatPct - estimated[1]!.bodyFatPct).toBeCloseTo(gap, 0);
  });

  it('dates the goal from the plan rate, or leaves it undated', () => {
    const input = { ...base, metrics: [point(at(2026, 9, 20), 84)] };
    const byRate = twinFrames({
      ...input,
      goal: { goalKg: 80, goalDate: '2026-01-01' },
      weeklyChangeKg: -0.5,
    });
    expect(byRate.at(-1)!.date).toBe('2026-11-21');
    const wrongWay = twinFrames({
      ...input,
      goal: { goalKg: 80, goalDate: null },
      weeklyChangeKg: 0.25,
    });
    expect(wrongWay.at(-1)!.date).toBeNull();
  });

  it('skips the goal when there is none or it is reached', () => {
    const metrics = [point(at(2026, 9, 20), 84)];
    expect(twinFrames({ ...base, metrics, goal: { goalKg: null, goalDate: null } })).toHaveLength(
      1,
    );
    expect(twinFrames({ ...base, metrics, goal: { goalKg: 84.2, goalDate: null } })).toHaveLength(
      1,
    );
  });
});
