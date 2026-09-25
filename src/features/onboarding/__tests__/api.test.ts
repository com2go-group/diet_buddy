import { EMPTY_DRAFT, type OnboardingDraft } from '../draft';

// Chainable fake of the Supabase query builder. Every call is recorded; mockResponses are queued per
// table and served in order.
type Call = { table: string; op: string; args: unknown[] };
const mockCalls: Call[] = [];
const mockResponses: Record<string, { data: unknown; error: null }[]> = {};

function mockBuilder(table: string) {
  const chain: Record<string, unknown> = {};
  let op = 'select';
  for (const method of [
    'select',
    'insert',
    'update',
    'upsert',
    'eq',
    'is',
    'order',
    'limit',
    'single',
    'maybeSingle',
  ]) {
    chain[method] = (...args: unknown[]) => {
      if (['insert', 'update', 'upsert'].includes(method)) op = method;
      mockCalls.push({ table, op: method, args });
      return chain;
    };
  }
  chain.then = (resolve: (v: unknown) => void) =>
    resolve(mockResponses[`${table}.${op}`]?.shift() ?? { data: null, error: null });
  return chain;
}

jest.mock('@/lib/supabase', () => ({
  ...jest.requireActual('@/lib/supabase/result'),
  supabase: {
    from: (table: string) => mockBuilder(table),
    rpc: (fn: string, args: unknown) => {
      mockCalls.push({ table: `rpc:${fn}`, op: 'rpc', args: [args] });
      return Promise.resolve({ data: null, error: null });
    },
  },
}));

// eslint-disable-next-line import/first
import { completeOnboarding, loadOnboarding, saveStep } from '../api';

const USER = 'user-1';
const draft: OnboardingDraft = {
  ...EMPTY_DRAFT,
  name: ' Alex ',
  birthDate: { day: '17', month: '5', year: '1990' },
  sex: 'female',
  healthConsent: true,
  units: 'imperial',
  weightKg: 80,
  heightCm: 170,
  goals: ['lose_fat'],
  goalWeightKg: 70,
  pace: 'fast',
  goalDate: 'custom',
  customGoalDate: { day: '1', month: '6', year: '2027' },
  motivations: ['health', 'other'],
  motivationOther: 'Wedding',
  activity: 'active',
  training: '2_3',
  dietStyles: ['mediterranean'],
  restrictions: ['halal'],
  allergies: ['peanuts'],
  customAllergies: ['Kiwi', 'Celery'],
};

const writes = (table: string) =>
  mockCalls.filter((c) => c.table === table && ['insert', 'update', 'upsert'].includes(c.op));

beforeEach(() => {
  mockCalls.length = 0;
  for (const key of Object.keys(mockResponses)) delete mockResponses[key];
});

describe('saveStep', () => {
  it('saves personal details and the next step', async () => {
    await saveStep(USER, 'personal', 'consent', draft, null);
    expect(writes('profiles')[0]?.args[0]).toEqual({
      onboarding_step: 'consent',
      name: 'Alex',
      birth_date: '1990-05-17',
      gender: 'female',
    });
    expect(writes('goals')).toHaveLength(0);
  });

  it('records health-data consent with its version', async () => {
    await saveStep(USER, 'consent', 'measurements', draft, null);
    expect(mockCalls.find((c) => c.op === 'rpc')).toEqual({
      table: 'rpc:set_consent',
      op: 'rpc',
      args: [{ p_type: 'health_data', p_granted: true, p_version: '2026-09-25' }],
    });
  });

  it('saves height before creating the goal row (the goal trigger needs it)', async () => {
    mockResponses['goals.insert'] = [{ data: { id: 'goal-1' }, error: null }];
    const goalId = await saveStep(USER, 'measurements', 'goal', draft, null);
    expect(goalId).toBe('goal-1');
    const order = mockCalls.filter((c) => ['update', 'insert'].includes(c.op)).map((c) => c.table);
    expect(order).toEqual(['profiles', 'goals']);
    expect(writes('profiles')[0]?.args[0]).toMatchObject({ height_cm: 170, units: 'imperial' });
    expect(writes('goals')[0]?.args[0]).toEqual({
      user_id: USER,
      goal_types: ['lose_fat'],
      start_weight_kg: 80,
      goal_weight_kg: 70,
      pace: 'fast',
      goal_date: '2027-06-01',
      motivations: ['health', 'other'],
      motivation_other: 'Wedding',
    });
  });

  it('updates the existing goal instead of inserting', async () => {
    await saveStep(USER, 'pace', 'goalDate', draft, 'goal-1');
    expect(writes('goals').map((c) => c.op)).toEqual(['update']);
    expect(mockCalls).toContainEqual({ table: 'goals', op: 'eq', args: ['id', 'goal-1'] });
  });

  it('clears fat-loss fields when Lose Fat is not a goal', async () => {
    await saveStep(USER, 'goal', 'goalDate', { ...draft, goals: ['build_muscle'] }, 'goal-1');
    expect(writes('goals')[0]?.args[0]).toMatchObject({ goal_weight_kg: null, pace: null });
  });

  it('upserts preferences, joining custom allergies', async () => {
    await saveStep(USER, 'allergies', 'healthApps', draft, 'goal-1');
    expect(writes('preferences')[0]?.args).toEqual([
      {
        user_id: USER,
        activity_level: 'active',
        training_frequency: '2_3',
        diet_styles: ['mediterranean'],
        restrictions: ['halal'],
        restriction_other: null,
        avoid_foods: [],
        allergies: ['peanuts'],
        allergy_other: 'Kiwi; Celery',
      },
      { onConflict: 'user_id' },
    ]);
  });

  it('records only progress for a skipped step', async () => {
    await saveStep(USER, null, 'devices', draft, 'goal-1');
    expect(
      mockCalls.filter((c) => ['update', 'insert', 'upsert'].includes(c.op)).map((c) => c.table),
    ).toEqual(['profiles']);
    expect(writes('profiles')[0]?.args[0]).toEqual({ onboarding_step: 'devices' });
  });
});

describe('loadOnboarding', () => {
  it('rebuilds the draft and resumes at the saved step', async () => {
    mockResponses['profiles.select'] = [
      {
        data: {
          name: 'Alex',
          birth_date: '1990-05-17',
          gender: 'female',
          units: 'metric',
          height_cm: 170,
          onboarding_step: 'goalDate',
        },
        error: null,
      },
    ];
    mockResponses['goals.select'] = [
      {
        data: {
          id: 'goal-1',
          goal_types: ['lose_fat'],
          start_weight_kg: 80,
          goal_weight_kg: 70,
          pace: 'sustainable',
          goal_date: '2027-06-01',
          motivations: [],
          motivation_other: null,
        },
        error: null,
      },
    ];
    mockResponses['preferences.select'] = [
      {
        data: {
          activity_level: 'active',
          training_frequency: null,
          diet_styles: [],
          restrictions: [],
          restriction_other: null,
          avoid_foods: ['tuna'],
          allergies: [],
          allergy_other: 'Kiwi; Celery',
        },
        error: null,
      },
    ];
    mockResponses['consents.select'] = [{ data: { granted: true }, error: null }];

    const state = await loadOnboarding(USER);
    expect(state.step).toBe('goalDate');
    expect(state.goalId).toBe('goal-1');
    expect(state.draft).toMatchObject({
      name: 'Alex',
      birthDate: { day: '17', month: '5', year: '1990' },
      healthConsent: true,
      weightKg: 80,
      pace: 'sustainable',
      goalDate: 'custom',
      customGoalDate: { day: '1', month: '6', year: '2027' },
      avoidFoods: ['tuna'],
      customAllergies: ['Kiwi', 'Celery'],
    });
  });

  it('starts at the beginning for a new user', async () => {
    mockResponses['profiles.select'] = [
      {
        data: {
          name: 'Alex',
          birth_date: null,
          gender: null,
          units: 'metric',
          height_cm: null,
          onboarding_step: null,
        },
        error: null,
      },
    ];
    const state = await loadOnboarding(USER);
    expect(state.step).toBe('personal');
    expect(state.draft.name).toBe('Alex');
    expect(state.draft.healthConsent).toBe(false);
  });

  it('falls back to the start if the saved step no longer applies', async () => {
    mockResponses['profiles.select'] = [
      {
        data: {
          name: '',
          birth_date: null,
          gender: null,
          units: 'metric',
          height_cm: null,
          onboarding_step: 'pace',
        },
        error: null,
      },
    ];
    expect((await loadOnboarding(USER)).step).toBe('personal');
  });
});

describe('completeOnboarding', () => {
  it('stores the first measurement and plan, then marks onboarding complete last', async () => {
    mockResponses['plans.select'] = [{ data: [], error: null }];
    const plan = await completeOnboarding(USER, draft);
    const order = mockCalls
      .filter((c) => ['insert', 'update'].includes(c.op))
      .map((c) => `${c.table}.${c.op}`);
    expect(order).toEqual(['body_metrics.insert', 'plans.insert', 'profiles.update']);
    expect(writes('plans')[0]?.args[0]).toMatchObject({
      user_id: USER,
      version: 1,
      daily_calories: plan.dailyCalories,
      protein_g: plan.macros.proteinG,
      generated_by: 'app',
    });
    expect(writes('profiles')[0]?.args[0]).toMatchObject({ onboarding_step: null });
    expect(plan.dailyCalories).toBeGreaterThanOrEqual(1200);
  });

  it('refuses to complete an unfinished draft', async () => {
    await expect(completeOnboarding(USER, { ...draft, activity: null })).rejects.toThrow(
      'incomplete',
    );
    expect(mockCalls.filter((c) => c.op === 'insert')).toHaveLength(0);
  });
});
