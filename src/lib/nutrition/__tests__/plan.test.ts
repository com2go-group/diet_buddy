import {
  calorieFloor,
  comparePaces,
  computePlan,
  dailyWaterMl,
  macroPercentages,
  macroTargets,
  minimumGoalWeightKg,
  pickStrategy,
  PlanInputError,
  proteinReferenceWeightKg,
  validateGoalWeight,
  type PlanInput,
} from '../plan';

const START = new Date(2026, 0, 1);

const baseLoss: PlanInput = {
  body: { sex: 'male', ageYears: 30, heightCm: 180, weightKg: 90 },
  activity: 'active',
  goals: ['lose_fat'],
  goalWeightKg: 80,
  pace: 'balanced',
  startDate: START,
};

const codes = (input: PlanInput) => computePlan(input).warnings.map((w) => w.code);

describe('computePlan: standard weight loss', () => {
  const plan = computePlan(baseLoss);

  it('derives energy from Mifflin-St Jeor and activity', () => {
    expect(plan.bmr).toBe(1880);
    expect(plan.tdee).toBe(2914); // 1880 × 1.55
  });

  it('applies a 550 kcal/day deficit for 0.5 kg/week, rounded to 10 kcal', () => {
    expect(plan.strategy).toBe('lose');
    expect(plan.dailyCalories).toBe(2360);
    expect(plan.dailyCalorieDelta).toBe(-554);
    expect(plan.weeklyChangeKg).toBeCloseTo(-0.5036, 3);
  });

  it('builds a timeline from kg to lose / weekly rate', () => {
    expect(plan.timeline).toEqual({
      kgToLose: 10,
      weeks: 20,
      goalDate: new Date(2026, 4, 21),
    });
  });

  it('sets macros from grams: 1.8 g/kg protein, 30 % fat, carbs the rest', () => {
    expect(plan.macros).toEqual({
      proteinG: 162,
      fatG: 79,
      carbsG: 250,
      fiberG: 33,
      pct: { protein: 28, carbs: 42, fat: 30 },
    });
  });

  it('computes hydration', () => {
    expect(plan.waterMl).toBe(3700); // 90 × 35 + 500 = 3650 → 3700
  });

  it('has no warnings', () => {
    expect(plan.warnings).toEqual([]);
  });
});

describe('computePlan: safety guardrails', () => {
  const smallWoman: PlanInput = {
    body: { sex: 'female', ageYears: 25, heightCm: 155, weightKg: 50 },
    activity: 'sedentary',
    goals: ['lose_fat'],
    goalWeightKg: 47,
    pace: 'balanced',
    startDate: START,
  };

  it('never goes below the 1,200 kcal female floor and slows the pace instead', () => {
    const plan = computePlan(smallWoman);
    expect(plan.calorieFloor).toBe(1200);
    expect(plan.dailyCalories).toBe(1200);
    expect(plan.weeklyChangeKg).toBeCloseTo(-0.199, 2);
    expect(plan.timeline?.weeks).toBe(16);
    expect(plan.warnings.map((w) => w.code)).toContain('calorie_floor_applied');
  });

  it('uses the 1,500 kcal male floor', () => {
    const plan = computePlan({
      ...baseLoss,
      body: { sex: 'male', ageYears: 60, heightCm: 165, weightKg: 70 },
      activity: 'sedentary',
      goalWeightKg: 65,
      pace: 'fast',
    });
    expect(plan.dailyCalories).toBeGreaterThanOrEqual(1500);
    expect(plan.warnings.map((w) => w.code)).toContain('calorie_floor_applied');
  });

  it('uses BMR as the floor when it is above the sex floor', () => {
    expect(calorieFloor('male', 1880)).toBe(1880);
    expect(calorieFloor('female', 1100)).toBe(1200);
    expect(calorieFloor('unspecified', 1000)).toBe(1350);

    const plan = computePlan({ ...baseLoss, activity: 'sedentary', pace: 'fast' });
    expect(plan.dailyCalories).toBeGreaterThanOrEqual(plan.bmr);
  });

  it('reports when no safe deficit exists and does not plan a loss', () => {
    const plan = computePlan({
      body: { sex: 'female', ageYears: 70, heightCm: 150, weightKg: 45 },
      activity: 'sedentary',
      goals: ['lose_fat'],
      goalWeightKg: 42,
      pace: 'sustainable',
    });
    expect(plan.dailyCalories).toBe(1200);
    expect(plan.weeklyChangeKg).toBe(0);
    expect(plan.timeline).toBeNull();
    expect(plan.warnings.map((w) => w.code)).toContain('no_safe_deficit');
  });

  it('caps weekly loss at 1 % of body weight', () => {
    const plan = computePlan({
      ...smallWoman,
      body: { ...smallWoman.body, weightKg: 60 },
      goalWeightKg: 55,
      activity: 'very_active',
      pace: 'fast',
    });
    expect(-plan.weeklyChangeKg).toBeLessThanOrEqual(0.6 + 0.01);
    expect(plan.warnings.map((w) => w.code)).toEqual(['fast_pace', 'weekly_loss_capped']);
  });

  it('always cautions on the fast pace', () => {
    expect(codes({ ...baseLoss, body: { ...baseLoss.body, weightKg: 120 }, pace: 'fast' })).toEqual(
      ['fast_pace'],
    );
  });

  it('warns when current BMI is underweight', () => {
    const plan = computePlan({
      body: { sex: 'female', ageYears: 30, heightCm: 170, weightKg: 52 },
      activity: 'lightly_active',
      goals: ['healthy_lifestyle'],
    });
    expect(plan.warnings).toContainEqual({ code: 'underweight_current', severity: 'caution' });
  });

  it('blocks a goal weight below BMI 18.5', () => {
    expect(() => computePlan({ ...baseLoss, goalWeightKg: 59 })).toThrow(PlanInputError);
    expect(validateGoalWeight(90, 59, 180)).toBe('goal_bmi_too_low');
    expect(validateGoalWeight(90, 60, 180)).toBeNull(); // BMI 18.52
  });

  it('blocks a loss goal that is not below the current weight', () => {
    expect(validateGoalWeight(90, 90, 180)).toBe('goal_not_below_current');
    expect(() => computePlan({ ...baseLoss, goalWeightKg: 95 })).toThrow(
      expect.objectContaining({ issue: 'goal_not_below_current' }),
    );
  });

  it('requires goal weight and pace for fat loss', () => {
    expect(() => computePlan({ ...baseLoss, goalWeightKg: undefined })).toThrow(
      expect.objectContaining({ issue: 'missing_goal_weight' }),
    );
    expect(() => computePlan({ ...baseLoss, pace: undefined })).toThrow(
      expect.objectContaining({ issue: 'missing_pace' }),
    );
  });

  it('gives the lowest allowed goal weight', () => {
    expect(minimumGoalWeightKg(170)).toBe(53.5); // 18.5 × 1.7² = 53.465
  });
});

describe('computePlan: other goals', () => {
  const body = { sex: 'male', ageYears: 30, heightCm: 180, weightKg: 75 } as const;

  it('adds a 250 kcal surplus and 2.2 g/kg protein for muscle gain', () => {
    const plan = computePlan({ body, activity: 'active', goals: ['build_muscle'] });
    expect(plan.strategy).toBe('gain');
    // BMR 1730 × 1.55 = 2681.5 → +250 → 2930
    expect(plan.dailyCalories).toBe(2930);
    expect(plan.macros.proteinG).toBe(165);
    expect(plan.weeklyChangeKg).toBe(0);
    expect(plan.timeline).toBeNull();
  });

  it('keeps maintenance for recomposition at a normal BMI', () => {
    const plan = computePlan({ body, activity: 'active', goals: ['body_recomposition'] });
    expect(plan.strategy).toBe('maintain');
    expect(plan.dailyCalories).toBe(2680);
  });

  it('runs a small deficit for recomposition at BMI ≥ 25', () => {
    const plan = computePlan({
      body: { ...body, weightKg: 88 },
      activity: 'active',
      goals: ['body_recomposition'],
    });
    expect(plan.strategy).toBe('recomp');
    expect(plan.dailyCalorieDelta).toBeCloseTo(-250, -1);
  });

  it('gives fat loss priority when several goals are chosen', () => {
    expect(pickStrategy(['build_muscle', 'lose_fat'], 22)).toBe('lose');
    expect(pickStrategy(['build_muscle', 'body_recomposition'], 27)).toBe('recomp');
    expect(pickStrategy(['improve_performance'], 27)).toBe('maintain');
  });

  it('uses 2.2 g/kg when building muscle while losing fat', () => {
    const plan = computePlan({ ...baseLoss, goals: ['lose_fat', 'build_muscle'] });
    expect(plan.macros.proteinG).toBe(198);
  });
});

describe('overrides from the body-scan screen', () => {
  it('uses an edited BMR for TDEE', () => {
    const plan = computePlan({ ...baseLoss, overrides: { bmr: 2000 } });
    expect(plan.bmr).toBe(2000);
    expect(plan.tdee).toBe(3100);
  });

  it('uses an edited TDEE directly', () => {
    const plan = computePlan({ ...baseLoss, overrides: { tdee: 2500 } });
    expect(plan.tdee).toBe(2500);
    expect(plan.dailyCalories).toBe(1950);
  });
});

describe('protein reference weight', () => {
  it('uses current weight below BMI 30', () => {
    expect(
      proteinReferenceWeightKg({ sex: 'male', ageYears: 40, heightCm: 175, weightKg: 90 }),
    ).toBe(90);
  });

  it('uses goal weight at BMI ≥ 30', () => {
    const body = { sex: 'male', ageYears: 40, heightCm: 175, weightKg: 120 } as const;
    expect(proteinReferenceWeightKg(body, 90)).toBe(90);
  });

  it('uses adjusted body weight at BMI ≥ 30 without a goal', () => {
    const body = { sex: 'male', ageYears: 40, heightCm: 175, weightKg: 120 } as const;
    // w25 = 76.5625; 76.5625 + 0.4 × 43.4375
    expect(proteinReferenceWeightKg(body)).toBeCloseTo(93.9375);
  });
});

describe('macros', () => {
  // Prototype bug 3 showed a fixed 30/40/30 split regardless of grams.
  it('derives percentages from grams, not a fixed split', () => {
    const m = macroTargets(1650, 70, ['lose_fat']);
    const kcal = m.proteinG * 4 + m.carbsG * 4 + m.fatG * 9;
    expect(Math.round((m.proteinG * 4 * 100) / kcal)).toBe(m.pct.protein);
    expect(m.pct.protein + m.pct.carbs + m.pct.fat).toBe(100);
    expect(m.pct).not.toEqual({ protein: 30, carbs: 40, fat: 30 });
  });

  it('never returns negative carbs', () => {
    expect(macroTargets(1200, 200, ['build_muscle']).carbsG).toBe(0);
  });

  it('handles zero grams', () => {
    expect(macroPercentages(0, 0, 0)).toEqual({ protein: 0, carbs: 0, fat: 0 });
  });
});

describe('dailyWaterMl', () => {
  it('scales with weight and activity within 1.5–4 L', () => {
    expect(dailyWaterMl(60, 'sedentary')).toBe(2100);
    expect(dailyWaterMl(60, 'very_active')).toBe(2600);
    expect(dailyWaterMl(35, 'sedentary')).toBe(1500);
    expect(dailyWaterMl(150, 'active')).toBe(4000);
  });
});

describe('comparePaces', () => {
  it('orders the timelines from slowest to fastest pace', () => {
    const [sustainable, balanced, fast] = comparePaces(baseLoss);
    expect(sustainable?.weeks).toBe(41); // 2914 − 275 → 2640 kcal: 274 deficit, 0.249 kg/week
    expect(balanced?.weeks).toBe(20);
    expect(fast?.weeks).toBeLessThan(20);
    expect(fast?.warnings).toContain('fast_pace');
  });
});
