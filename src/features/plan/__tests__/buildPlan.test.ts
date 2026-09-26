import { computePlan } from '@/lib/nutrition';

import { EMPTY_DRAFT, planInputFrom, type OnboardingDraft } from '../../onboarding/draft';
import { buildInitialPlan, planRow } from '../buildPlan';

const TODAY = new Date(2026, 8, 26);
const draft: OnboardingDraft = {
  ...EMPTY_DRAFT,
  name: 'Olivia',
  birthDate: { day: '12', month: '4', year: '1991' },
  sex: 'female',
  weightKg: 82,
  heightCm: 168,
  goals: ['lose_fat'],
  goalWeightKg: 70,
  pace: 'balanced',
  activity: 'active',
  training: '4_5',
};

describe('buildInitialPlan', () => {
  it('matches the onboarding plan when the scan changed nothing', () => {
    const built = buildInitialPlan(
      draft,
      { weight_kg: 82, bmr: 1539, tdee: 2385, user_overridden: false },
      TODAY,
    )!;
    expect(built.plan).toEqual(computePlan(planInputFrom(draft, TODAY)!));
    expect(built.input.overrides).toBeUndefined();
  });

  it('uses the scan weight as the starting weight', () => {
    const built = buildInitialPlan(
      draft,
      { weight_kg: 80, bmr: 1519, tdee: 2354, user_overridden: false },
      TODAY,
    )!;
    expect(built.input.body.weightKg).toBe(80);
    expect(built.milestones.at(-1)).toMatchObject({ kind: 'goal', weightKg: 70, lostKg: 10 });
  });

  it('applies BMR/TDEE the user edited on the scan screen', () => {
    const built = buildInitialPlan(
      draft,
      { weight_kg: 82, bmr: 1600, tdee: 2600, user_overridden: true },
      TODAY,
    )!;
    expect(built.plan.bmr).toBe(1600);
    expect(built.plan.tdee).toBe(2600);
    expect(built.plan.dailyCalories).toBe(2600 - 550 + 0); // 0.5 kg/week = 550 kcal/day
  });

  it('still enforces the calorie floor with edited values', () => {
    const built = buildInitialPlan(
      draft,
      { weight_kg: 82, bmr: 1000, tdee: 1300, user_overridden: true },
      TODAY,
    )!;
    expect(built.plan.dailyCalories).toBe(1200);
    expect(built.plan.warnings.map((w) => w.code)).toContain('calorie_floor_applied');
  });

  it('builds an exercise week and a forecast for fat loss', () => {
    const built = buildInitialPlan(draft, null, TODAY)!;
    expect(built.exercise.flatMap((s) => s.days)).toHaveLength(7);
    expect(built.milestones.map((m) => m.kind)).toEqual(['first_kg', 'halfway', 'goal']);
    expect(built.curve[0]).toBe(82);
    expect(built.curve.at(-1)).toBe(70);
  });

  it('has no forecast for goals without a planned loss', () => {
    const built = buildInitialPlan(
      { ...draft, goals: ['build_muscle'], goalWeightKg: null },
      null,
      TODAY,
    )!;
    expect(built.milestones).toEqual([]);
    expect(built.curve).toEqual([82]);
    expect(built.plan.dailyCalorieDelta).toBeGreaterThan(0);
  });

  it('defaults training frequency when it was skipped', () => {
    const built = buildInitialPlan({ ...draft, training: null }, null, TODAY)!;
    expect(built.exercise[0]).toMatchObject({ type: 'strength', minutes: 45 });
  });

  it('returns null without the required answers', () => {
    expect(buildInitialPlan({ ...draft, activity: null }, null, TODAY)).toBeNull();
  });
});

describe('planRow', () => {
  it('stores targets, exercise and forecast', () => {
    const built = buildInitialPlan(draft, null, TODAY)!;
    const row = planRow('user-1', 1, built);
    expect(row).toMatchObject({
      user_id: 'user-1',
      version: 1,
      daily_calories: built.plan.dailyCalories,
      protein_g: built.plan.macros.proteinG,
      water_ml: built.plan.waterMl,
      generated_by: 'app',
      exercise_recommendation: { sessions: built.exercise },
    });
    expect(row.forecast).toMatchObject({
      weeks: built.plan.timeline?.weeks,
      milestones: [
        { kind: 'first_kg', weight_kg: 81 },
        { kind: 'halfway', weight_kg: 76 },
        { kind: 'goal', weight_kg: 70 },
      ],
    });
  });
});
