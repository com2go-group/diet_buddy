import { formatWeight } from '@/lib/format';

import {
  EMPTY_DRAFT,
  goalDateFrom,
  isoToParts,
  planInputFrom,
  previewInputFrom,
  toggleGoal,
  toggleOption,
  validateStep,
  type OnboardingDraft,
} from '../draft';
import { buildSteps } from '../options';

const TODAY = new Date(2026, 8, 25);
const kg = (v: number) => formatWeight(v, 'metric');

const complete: OnboardingDraft = {
  ...EMPTY_DRAFT,
  name: 'Alex',
  birthDate: { day: '17', month: '5', year: '1990' },
  sex: 'female',
  healthConsent: true,
  weightKg: 80,
  heightCm: 170,
  goals: ['lose_fat'],
  goalWeightKg: 70,
  activity: 'active',
  training: '2_3',
};

const keys = (d: OnboardingDraft, step: Parameters<typeof validateStep>[0]) =>
  Object.fromEntries(Object.entries(validateStep(step, d, kg, TODAY)).map(([k, v]) => [k, v?.key]));

describe('buildSteps', () => {
  it('adds goal weight and pace only for fat loss', () => {
    expect(buildSteps(['build_muscle'])).not.toContain('pace');
    expect(buildSteps(['lose_fat'])).toEqual(expect.arrayContaining(['goalWeight', 'pace']));
    expect(buildSteps(['lose_fat']).indexOf('goalWeight')).toBe(buildSteps([]).indexOf('goal') + 1);
  });

  it('asks for consent before any measurements', () => {
    const steps = buildSteps([]);
    expect(steps.indexOf('consent')).toBeLessThan(steps.indexOf('measurements'));
    expect(steps.at(-1)).toBe('aiPlan');
  });
});

describe('validateStep', () => {
  it('requires name, an adult birth date and sex', () => {
    expect(keys(EMPTY_DRAFT, 'personal')).toEqual({
      name: 'authErrors.required',
      birthDate: 'authErrors.invalidDate',
      sex: 'onboarding.required',
    });
    const minor = { ...complete, birthDate: { day: '26', month: '9', year: '2008' } };
    expect(keys(minor, 'personal')).toEqual({ birthDate: 'authErrors.underage' });
    const eighteenToday = { ...complete, birthDate: { day: '25', month: '9', year: '2008' } };
    expect(keys(eighteenToday, 'personal')).toEqual({});
  });

  it('requires health-data consent', () => {
    expect(keys({ ...complete, healthConsent: false }, 'consent')).toEqual({
      consent: 'consent.mustAgree',
    });
    expect(keys(complete, 'consent')).toEqual({});
  });

  it('checks measurement ranges', () => {
    expect(keys({ ...complete, weightKg: 20, heightCm: 300 }, 'measurements')).toEqual({
      weight: 'measurements.weightRange',
      height: 'measurements.heightRange',
    });
    expect(keys({ ...complete, weightKg: null }, 'measurements')).toHaveProperty('weight');
    expect(keys(complete, 'measurements')).toEqual({});
  });

  it('blocks goal weights at or above current weight or below BMI 18.5', () => {
    expect(keys({ ...complete, goalWeightKg: 80 }, 'goalWeight')).toEqual({
      goalWeight: 'goalWeight.notBelow',
    });
    const tooLow = validateStep('goalWeight', { ...complete, goalWeightKg: 50 }, kg, TODAY);
    expect(tooLow.goalWeight).toEqual({ key: 'goalWeight.tooLow', params: { min: '53.5 kg' } });
    expect(keys({ ...complete, goalWeightKg: 53.5 }, 'goalWeight')).toEqual({});
  });

  it('shows the minimum goal weight in the user’s units', () => {
    const lb = (v: number) => formatWeight(v, 'imperial');
    const r = validateStep('goalWeight', { ...complete, goalWeightKg: 50 }, lb, TODAY);
    expect(r.goalWeight?.params).toEqual({ min: '117.9 lb' });
  });

  it('needs at least one goal', () => {
    expect(keys({ ...complete, goals: [] }, 'goal')).toEqual({ goals: 'onboarding.selectGoal' });
  });

  it('needs a custom goal date at least two weeks ahead', () => {
    const custom = (day: string, month: string, year: string) =>
      keys({ ...complete, goalDate: 'custom', customGoalDate: { day, month, year } }, 'goalDate');
    expect(custom('1', '10', '2026')).toEqual({ customGoalDate: 'goalDate.invalidDate' });
    expect(custom('9', '10', '2026')).toEqual({});
    expect(custom('31', '2', '2027')).toEqual({ customGoalDate: 'goalDate.invalidDate' });
    expect(keys({ ...complete, goalDate: 'six_months' }, 'goalDate')).toEqual({});
  });

  it('requires activity and training answers', () => {
    expect(keys({ ...complete, activity: null }, 'activity')).toEqual({
      activity: 'onboarding.required',
    });
    expect(keys({ ...complete, training: null }, 'trainingFreq')).toEqual({
      training: 'onboarding.required',
    });
  });

  it('lets optional steps through', () => {
    for (const step of [
      'motivation',
      'dietStyle',
      'restrictions',
      'avoidFoods',
      'allergies',
      'healthApps',
      'devices',
    ] as const) {
      expect(keys(EMPTY_DRAFT, step)).toEqual({});
    }
  });
});

describe('planInputFrom', () => {
  it('maps the draft to plan inputs', () => {
    expect(planInputFrom(complete, TODAY)).toEqual({
      body: { sex: 'female', ageYears: 36, heightCm: 170, weightKg: 80 },
      activity: 'active',
      goals: ['lose_fat'],
      goalWeightKg: 70,
      pace: 'balanced',
      startDate: TODAY,
    });
  });

  it('uses the averaged equations when sex is not given', () => {
    expect(planInputFrom({ ...complete, sex: null }, TODAY)?.body.sex).toBe('unspecified');
  });

  it('drops goal weight and pace for non-loss goals', () => {
    const input = planInputFrom({ ...complete, goals: ['build_muscle'], goalWeightKg: 90 }, TODAY);
    expect(input?.goalWeightKg).toBeUndefined();
    expect(input?.pace).toBeUndefined();
  });

  it('returns null until required answers exist', () => {
    expect(planInputFrom({ ...complete, activity: null }, TODAY)).toBeNull();
    expect(planInputFrom({ ...complete, goalWeightKg: null }, TODAY)).toBeNull();
  });

  it('previews with Lightly Active before the activity step', () => {
    expect(previewInputFrom({ ...complete, activity: null }, TODAY)?.activity).toBe(
      'lightly_active',
    );
    expect(previewInputFrom(complete, TODAY)?.activity).toBe('active');
  });
});

describe('goalDateFrom', () => {
  it('adds months for presets', () => {
    expect(goalDateFrom({ ...complete, goalDate: 'three_months' }, TODAY)).toEqual(
      new Date(2026, 11, 25),
    );
    expect(goalDateFrom({ ...complete, goalDate: 'twelve_months' }, TODAY)).toEqual(
      new Date(2027, 8, 25),
    );
  });

  it('parses custom dates', () => {
    const d = goalDateFrom(
      { ...complete, goalDate: 'custom', customGoalDate: { day: '1', month: '3', year: '2027' } },
      TODAY,
    );
    expect(d).toEqual(new Date(2027, 2, 1));
    expect(goalDateFrom({ ...complete, goalDate: 'custom' }, TODAY)).toBeNull();
  });
});

describe('option helpers', () => {
  it('toggles items and keeps exclusive options exclusive', () => {
    expect(toggleOption(['keto'], 'vegan')).toEqual(['keto', 'vegan']);
    expect(toggleOption(['keto', 'vegan'], 'keto')).toEqual(['vegan']);
    expect(toggleOption(['keto', 'vegan'], 'no_preference', 'no_preference')).toEqual([
      'no_preference',
    ]);
    expect(toggleOption(['no_preference'], 'keto', 'no_preference')).toEqual(['keto']);
  });

  it('clears fat-loss answers when Lose Fat is removed', () => {
    const d = { ...complete, pace: 'fast' as const };
    expect(toggleGoal(d, 'lose_fat')).toEqual({ goals: [], goalWeightKg: null, pace: 'balanced' });
    expect(toggleGoal(d, 'build_muscle')).toEqual({ goals: ['lose_fat', 'build_muscle'] });
  });

  it('round-trips ISO dates', () => {
    expect(isoToParts('1990-05-07')).toEqual({ year: '1990', month: '5', day: '7' });
    expect(isoToParts(null)).toEqual({ day: '', month: '', year: '' });
  });
});
