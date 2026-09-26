import { exerciseRecommendation } from '../exercise';

const days = (s: { days: string[] }[]) => s.flatMap((x) => x.days).sort();

describe('exerciseRecommendation', () => {
  it.each(['0_1', '2_3', '4_5', '6_plus'] as const)('covers each day exactly once for %s', (f) => {
    expect(days(exerciseRecommendation(f, ['healthy_lifestyle'], 70))).toEqual([
      'fri',
      'mon',
      'sat',
      'sun',
      'thu',
      'tue',
      'wed',
    ]);
  });

  it('matches the prototype week for 2–3 training days', () => {
    expect(exerciseRecommendation('2_3', ['build_muscle'], 70)).toEqual([
      { days: ['mon', 'wed', 'fri'], type: 'strength', minutes: 45, kcal: 260 },
      { days: ['tue', 'thu'], type: 'cardio', minutes: 30, kcal: 150 },
      { days: ['sat'], type: 'active_rest', minutes: 30, kcal: 90 },
      { days: ['sun'], type: 'rest', minutes: 0, kcal: 0 },
    ]);
  });

  it('adds cardio time for fat loss', () => {
    const cardio = exerciseRecommendation('2_3', ['lose_fat'], 70).find((s) => s.type === 'cardio');
    expect(cardio?.minutes).toBe(40);
  });

  it('turns one cardio session into intervals for performance goals', () => {
    const plan = exerciseRecommendation('4_5', ['improve_performance'], 70);
    expect(plan.filter((s) => s.type === 'intervals')).toHaveLength(1);
    expect(plan.find((s) => s.type === 'intervals')?.minutes).toBeLessThanOrEqual(30);
  });

  it('scales calorie estimates with body weight', () => {
    const light = exerciseRecommendation('2_3', [], 60)[0]!.kcal;
    const heavy = exerciseRecommendation('2_3', [], 120)[0]!.kcal;
    // Each estimate is rounded to 10 kcal, so allow one rounding step either way.
    expect(Math.abs(heavy - light * 2)).toBeLessThanOrEqual(20);
  });

  it('starts beginners gently', () => {
    const plan = exerciseRecommendation('0_1', [], 70);
    expect(plan.filter((s) => s.type === 'strength').flatMap((s) => s.days)).toHaveLength(2);
    expect(Math.max(...plan.map((s) => s.minutes))).toBeLessThanOrEqual(30);
  });
});
