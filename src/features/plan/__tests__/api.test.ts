import { EMPTY_DRAFT } from '../../onboarding/draft';
import { saveBodyScan } from '../../bodyScan/api';
import { scanResults } from '../../bodyScan/results';
import { completeOnboarding } from '../api';
import { buildInitialPlan } from '../buildPlan';

type Call = { table: string; op: string; args: unknown[] };
const mockCalls: Call[] = [];
const mockResponses: Record<string, { data: unknown; error: null }[]> = {};

function mockBuilder(table: string) {
  const chain: Record<string, unknown> = {};
  let op = 'select';
  for (const m of ['select', 'insert', 'update', 'eq', 'order', 'limit']) {
    chain[m] = (...args: unknown[]) => {
      if (['insert', 'update'].includes(m)) op = m;
      mockCalls.push({ table, op: m, args });
      return chain;
    };
  }
  chain.then = (resolve: (v: unknown) => void) =>
    resolve(mockResponses[`${table}.${op}`]?.shift() ?? { data: null, error: null });
  return chain;
}

jest.mock('@/lib/supabase', () => ({
  ...jest.requireActual('@/lib/supabase/result'),
  supabase: { from: (table: string) => mockBuilder(table) },
}));

const draft = {
  ...EMPTY_DRAFT,
  name: 'Olivia',
  birthDate: { day: '12', month: '4', year: '1991' },
  sex: 'female' as const,
  weightKg: 82,
  heightCm: 168,
  goals: ['lose_fat' as const],
  goalWeightKg: 70,
  activity: 'active' as const,
};
const inputs = {
  sex: 'female' as const,
  ageYears: 35,
  heightCm: 168,
  weightKg: 82,
  activity: 'active' as const,
  waistCm: 80,
  neckCm: 33,
  hipCm: 104,
};
const writes = () =>
  mockCalls.filter((c) => ['insert', 'update'].includes(c.op)).map((c) => `${c.table}.${c.op}`);

beforeEach(() => {
  mockCalls.length = 0;
  for (const k of Object.keys(mockResponses)) delete mockResponses[k];
});

describe('saveBodyScan', () => {
  it('stores the scan and moves on to the plan', async () => {
    await saveBodyScan('u1', draft, 'g1', inputs, scanResults(inputs, { bmr: 1600 }));
    expect(writes()).toEqual(['body_metrics.insert', 'profiles.update']);
    const metric = mockCalls.find((c) => c.op === 'insert')!.args[0] as Record<string, unknown>;
    expect(metric).toMatchObject({
      user_id: 'u1',
      source: 'manual',
      weight_kg: 82,
      waist_cm: 80,
      bmr: 1600,
      user_overridden: true,
    });
    // Navy, female: 495 / (1.29579 − 0.35004·log10(80 + 104 − 33) + 0.221·log10(168)) − 450 = 33.0
    expect(metric.body_fat_pct).toBe(33);
    expect(
      mockCalls.find((c) => c.table === 'profiles' && c.op === 'update')!.args[0],
    ).toMatchObject({ onboarding_step: 'initialPlan' });
  });

  it('updates the goal’s start weight when the weight was corrected', async () => {
    await saveBodyScan(
      'u1',
      draft,
      'g1',
      { ...inputs, weightKg: 80 },
      scanResults({ ...inputs, weightKg: 80 }),
    );
    expect(writes()).toEqual(['body_metrics.insert', 'goals.update', 'profiles.update']);
    expect(mockCalls.find((c) => c.table === 'goals')!.args[0]).toEqual({ start_weight_kg: 80 });
  });

  it('marks untouched results as calculated', async () => {
    await saveBodyScan('u1', draft, 'g1', inputs, scanResults(inputs));
    expect(
      (mockCalls.find((c) => c.op === 'insert')!.args[0] as { user_overridden: boolean })
        .user_overridden,
    ).toBe(false);
  });
});

describe('completeOnboarding', () => {
  it('stores the next plan version, then marks onboarding complete', async () => {
    mockResponses['plans.select'] = [{ data: [{ version: 2 }], error: null }];
    await completeOnboarding('u1', buildInitialPlan(draft, null)!);
    expect(writes()).toEqual(['plans.insert', 'profiles.update']);
    expect((mockCalls.find((c) => c.op === 'insert')!.args[0] as { version: number }).version).toBe(
      3,
    );
    expect(mockCalls.find((c) => c.op === 'update')!.args[0]).toMatchObject({
      onboarding_step: null,
    });
  });
});
