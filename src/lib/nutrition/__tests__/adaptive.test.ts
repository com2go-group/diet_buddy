import { adaptivePlan, weightSlopePerDay, type AdaptiveInput } from '../adaptive';

const start = new Date('2026-09-01T08:00:00Z');
const at = (day: number) => new Date(start.getTime() + day * 86_400_000);
const days = (n: number, kcal: number) =>
  Array.from({ length: n }, (_, i) => ({ day: `2026-09-${String(i + 1).padStart(2, '0')}`, kcal }));
/** Weigh-ins every other day for 14 days, changing `perWeek` kg a week. */
const weights = (from: number, perWeek: number) =>
  Array.from({ length: 8 }, (_, i) => ({ at: at(i * 2), kg: from + (perWeek / 7) * i * 2 }));

const base: AdaptiveInput = {
  days: days(14, 1800),
  weights: weights(80, -0.5),
  currentTarget: 1800,
  plannedWeeklyKg: -0.5,
  floor: 1300,
  weightKg: 80,
};

describe('adaptivePlan', () => {
  it('reads the weight trend as kg per day', () => {
    expect(weightSlopePerDay(weights(80, -0.7))).toBeCloseTo(-0.1, 5);
    expect(weightSlopePerDay([{ at: start, kg: 80 }])).toBeNull();
  });

  it('is on track when weight moves as planned', () => {
    const result = adaptivePlan(base);
    expect(result.kind).toBe('on_track');
    // 1800 kcal eaten while losing 0.5 kg/week → about 2350 kcal used.
    expect(result.kind === 'on_track' && result.estimatedTdee).toBe(2350);
  });

  it('suggests eating less when loss is slower than planned, at most 300 kcal at once', () => {
    const result = adaptivePlan({ ...base, weights: weights(80, 0) });
    expect(result).toMatchObject({
      kind: 'suggest',
      suggested: 1500,
      reason: 'slower_than_planned',
    });
  });

  it('suggests eating more when loss is faster than planned', () => {
    const result = adaptivePlan({ ...base, weights: weights(80, -1) });
    expect(result).toMatchObject({
      kind: 'suggest',
      suggested: 2100,
      reason: 'faster_than_planned',
    });
  });

  it('never suggests below the calorie floor', () => {
    const result = adaptivePlan({ ...base, weights: weights(80, 0), floor: 1700 });
    expect(result).toMatchObject({ kind: 'suggest', suggested: 1700 });
    expect(adaptivePlan({ ...base, weights: weights(80, 0), floor: 1750 }).kind).toBe('on_track');
  });

  it('caps the planned loss at 1 % of body weight a week', () => {
    // Planned −1 kg/week at 60 kg is capped to −0.6.
    const result = adaptivePlan({
      ...base,
      weightKg: 60,
      plannedWeeklyKg: -1,
      weights: weights(60, -0.6),
    });
    expect(result.kind).toBe('on_track');
  });

  it('waits for 10 fully logged days and 10 days of weigh-ins', () => {
    expect(adaptivePlan({ ...base, days: days(9, 1800) }).kind).toBe('not_enough_data');
    // Days with under half the target logged don't count.
    expect(adaptivePlan({ ...base, days: days(14, 600) }).kind).toBe('not_enough_data');
    expect(
      adaptivePlan({
        ...base,
        weights: [
          { at: at(0), kg: 80 },
          { at: at(5), kg: 79.6 },
        ],
      }).kind,
    ).toBe('not_enough_data');
  });

  it('ignores implausible estimates', () => {
    expect(adaptivePlan({ ...base, weights: weights(80, -5) }).kind).toBe('not_enough_data');
  });
});
