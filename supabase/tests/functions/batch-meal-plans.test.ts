import {
  parseResults,
  type BatchClient,
  type BatchResult,
} from '../../functions/_shared/anthropicBatch';
import type { DietPrefs } from '../../functions/_shared/dietRules';
import type { LlmProvider } from '../../functions/_shared/llm';
import type { FoodResult } from '../../functions/_shared/usda';
import { cachedSearch } from '../../functions/_shared/usdaCache';
import {
  DEFAULT_SETTINGS,
  handleBatchMealPlans,
  tomorrowUtc,
  type BatchDeps,
  type BatchStore,
  type PendingBatch,
} from '../../functions/batch-meal-plans/handler';
import type { MealPlanContext } from '../../functions/generate-meal-plan/handler';
import type { MealPlan } from '../../functions/generate-meal-plan/plan';

const U1 = '11111111-1111-4111-8111-111111111111';
const U2 = '22222222-2222-4222-8222-222222222222';
const U3 = '33333333-3333-4333-8333-333333333333';
const EVENING = new Date('2026-09-29T18:00:00Z');
const MORNING = new Date('2026-09-29T08:00:00Z');

const noPrefs: DietPrefs = {
  dietStyles: [],
  restrictions: [],
  restrictionOther: null,
  allergies: [],
  allergyOther: null,
  avoidFoods: [],
};
const ctx = (over: Partial<MealPlanContext> = {}): MealPlanContext => ({
  premium: false,
  prefs: noPrefs,
  targets: { calories: 1800, proteinG: 130 },
  ...over,
});

const food = (q: string, name: string): FoodResult => ({
  ref: `usda:${q}`,
  name,
  brand: null,
  per100g: { kcal: 150, proteinG: 10, carbsG: 15, fatG: 5, fiberG: 2 },
  servings: [],
});
const usda: Record<string, FoodResult> = {
  oats: food('oats', 'Oats, rolled, dry'),
  'chicken breast': food('chicken breast', 'Chicken, breast, roasted'),
  'peanut butter': food('peanut butter', 'Peanut butter, smooth'),
  lentils: food('lentils', 'Lentils, cooked'),
};
const meal = (title: string, name: string, q: string) => ({
  title,
  description: 'Simple.',
  ingredients: [{ name, usda_query: q, grams: 100 }],
});
const reply = (snack = meal('Peanut butter bite', 'Peanut butter', 'peanut butter')) =>
  JSON.stringify({
    meals: {
      breakfast: meal('Porridge', 'Oats', 'oats'),
      lunch: meal('Chicken bowl', 'Chicken', 'chicken breast'),
      snack,
      dinner: meal('Lentil stew', 'Lentils', 'lentils'),
    },
  });
const result = (customId: string, over: Partial<BatchResult> = {}): BatchResult => ({
  customId,
  ok: true,
  text: reply(),
  model: 'claude-haiku-4-5',
  inputTokens: 900,
  outputTokens: 600,
  ...over,
});

function setup(
  opts: {
    pending?: PendingBatch[];
    results?: BatchResult[];
    batchStatus?: 'in_progress' | 'ended';
    hasBatch?: boolean;
    contexts?: Record<string, MealPlanContext>;
    plans?: Set<string>;
    languages?: Record<string, string>;
    parallel?: number;
  } = {},
) {
  const saved: {
    userId: string;
    date: string;
    plan: MealPlan;
  }[] = [];
  const usage: { userId: string; batch: boolean }[] = [];
  const finished: { id: string; status: string; counts: object }[] = [];
  const progress: { id: string; offset: number }[] = [];
  const recorded: { batchId: string; date: string; count: number }[] = [];
  const contexts = opts.contexts ?? { [U1]: ctx(), [U2]: ctx(), [U3]: ctx() };
  const store: BatchStore = {
    settings: async () => ({ ...DEFAULT_SETTINGS, parallel: opts.parallel ?? 2 }),
    pending: async () => opts.pending ?? [],
    hasBatch: async () => opts.hasBatch ?? false,
    candidates: async () => Object.keys(contexts).map((userId) => ({ userId, language: null })),
    contexts: async (ids) => new Map(ids.map((id) => [id, contexts[id]!])),
    record: async (batchId, date, count) => void recorded.push({ batchId, date, count }),
    progress: async (id, offset) => void progress.push({ id, offset }),
    finish: async (id, status, counts) => void finished.push({ id, status, counts }),
    context: async (id) => contexts[id] ?? ctx(),
    hasPlan: async (id) => opts.plans?.has(id) ?? false,
    languageOf: async (id) => opts.languages?.[id] ?? null,
    save: async (userId, date, plan) => void saved.push({ userId, date, plan }),
    logUsage: async (userId, _m, _i, _o, batch) => void usage.push({ userId, batch }),
  };
  const created: unknown[] = [];
  const client: BatchClient = {
    create: jest.fn(async (requests) => {
      created.push(...requests);
      return { id: 'msgbatch_1', status: 'in_progress' as const, resultsUrl: null };
    }),
    get: jest.fn(async (id) => ({
      id,
      status: opts.batchStatus ?? 'ended',
      resultsUrl: 'https://results',
    })),
    results: jest.fn(async () => opts.results ?? []),
  };
  const llm: LlmProvider = {
    complete: jest.fn(async (req) => {
      const texts = JSON.parse(req.messages[0]!.content as string) as string[];
      return {
        text: JSON.stringify({ t: texts.map((t) => `DE ${t}`) }),
        model: 'claude-haiku-4-5',
        inputTokens: 50,
        outputTokens: 50,
      };
    }),
  };
  const deps: BatchDeps = {
    secret: 'cron',
    store,
    batch: client,
    model: 'claude-haiku-4-5',
    llm,
    searchFoods: async (q) => (usda[q] ? [usda[q]!] : []),
    now: () => EVENING,
  };
  return { deps, saved, usage, finished, progress, recorded, created, client, llm };
}

const post = (auth = 'Bearer cron') =>
  new Request('http://x', { method: 'POST', headers: { Authorization: auth } });
const pendingBatch = (over: Partial<PendingBatch> = {}): PendingBatch => ({
  id: 'row-1',
  batchId: 'msgbatch_0',
  planDate: '2026-09-30',
  createdAt: new Date('2026-09-28T17:05:00Z'),
  offset: 0,
  counts: { stored: 0, skipped: 0, failed: 0 },
  ...over,
});

describe('batch-meal-plans', () => {
  it('needs the cron secret', async () => {
    const { deps } = setup();
    expect((await handleBatchMealPlans(post('Bearer nope'), deps)).status).toBe(401);
    expect((await handleBatchMealPlans(post(), { ...deps, secret: undefined })).status).toBe(401);
  });

  it('does nothing without API keys', async () => {
    const { deps } = setup();
    const res = await handleBatchMealPlans(post(), { ...deps, batch: null });
    expect(await res.json()).toEqual({ ok: true, configured: false });
  });

  it('sends tomorrow’s free-user requests once, after the configured hour', async () => {
    const { deps, created, recorded } = setup({
      contexts: {
        [U1]: ctx(),
        [U2]: ctx({ premium: true }),
        [U3]: ctx({ targets: null }),
      },
    });
    const res = await handleBatchMealPlans(post(), deps);
    expect((await res.json()).submitted).toBe(1);
    expect(created).toEqual([
      expect.objectContaining({
        custom_id: U1,
        params: expect.objectContaining({
          model: 'claude-haiku-4-5',
          max_tokens: 1000,
          messages: [{ role: 'user', content: 'Plan meals for 2026-09-30.' }],
        }),
      }),
    ]);
    // Free users' plans are the concise ones.
    expect((created[0] as { params: { system: string } }).params.system).toMatch(/Keep it brief/);
    expect(recorded).toEqual([{ batchId: 'msgbatch_1', date: '2026-09-30', count: 1 }]);

    const before = setup();
    await handleBatchMealPlans(post(), { ...before.deps, now: () => MORNING });
    expect(before.client.create).not.toHaveBeenCalled();
    const again = setup({ hasBatch: true });
    await handleBatchMealPlans(post(), again.deps);
    expect(again.client.create).not.toHaveBeenCalled();
  });

  it('stores checked plans from finished batches, logging the batch usage', async () => {
    const { deps, saved, usage, finished } = setup({
      pending: [pendingBatch()],
      results: [result(U2), result(U1)],
    });
    const body = await (await handleBatchMealPlans(post(), deps)).json();
    expect(body).toMatchObject({ stored: 2, processed: 1 });
    expect(saved.map((s) => s.userId).sort()).toEqual([U1, U2]);
    expect(saved[0]!.date).toBe('2026-09-30');
    expect(saved[0]!.plan).toMatchObject({ version: 2, model: 'claude-haiku-4-5' });
    expect(usage).toEqual([
      { userId: U1, batch: true },
      { userId: U2, batch: true },
    ]);
    expect(finished).toEqual([
      { id: 'row-1', status: 'processed', counts: { stored: 2, skipped: 0, failed: 0 } },
    ]);
  });

  it('never stores a plan that breaks the user’s allergies', async () => {
    const { deps, saved } = setup({
      pending: [pendingBatch()],
      results: [result(U1)],
      contexts: { [U1]: ctx({ prefs: { ...noPrefs, allergies: ['peanuts'] } }) },
    });
    const body = await (await handleBatchMealPlans(post(), deps)).json();
    expect(body).toMatchObject({ stored: 0, failed: 1 });
    expect(saved).toEqual([]);
  });

  it('skips users who have a plan by now or went Premium, and bad or errored results', async () => {
    const { deps, saved } = setup({
      pending: [pendingBatch()],
      results: [result(U1), result(U2), result(U3, { ok: false, text: '' }), result('not-a-user')],
      plans: new Set([U1]),
      contexts: { [U1]: ctx(), [U2]: ctx({ premium: true }), [U3]: ctx() },
    });
    const body = await (await handleBatchMealPlans(post(), deps)).json();
    expect(body).toMatchObject({ stored: 0, skipped: 2, failed: 2 });
    expect(saved).toEqual([]);
  });

  it('translates for users of other languages', async () => {
    const { deps, saved, usage } = setup({
      pending: [pendingBatch()],
      results: [result(U1)],
      languages: { [U1]: 'de' },
    });
    await handleBatchMealPlans(post(), deps);
    expect(saved[0]!.plan.dishes?.breakfast).toMatchObject({
      title: 'DE Porridge',
      sourceTitle: 'Porridge',
    });
    expect(usage).toEqual([
      { userId: U1, batch: true },
      { userId: U1, batch: false },
    ]);
  });

  it('works in chunks within the deadline and resumes from the stored offset', async () => {
    let t = 0;
    const first = setup({
      pending: [pendingBatch()],
      results: [result(U1), result(U2), result(U3)],
      parallel: 1,
    });
    await handleBatchMealPlans(post(), {
      ...first.deps,
      elapsed: () => (t += 40),
      deadlineMs: 100,
    });
    expect(first.saved.map((s) => s.userId)).toEqual([U1]);
    expect(first.progress).toEqual([{ id: 'row-1', offset: 1 }]);
    expect(first.finished).toEqual([]);

    const second = setup({
      pending: [pendingBatch({ offset: 1, counts: { stored: 1, skipped: 0, failed: 0 } })],
      results: [result(U3), result(U1), result(U2)],
    });
    await handleBatchMealPlans(post(), second.deps);
    expect(second.saved.map((s) => s.userId)).toEqual([U2, U3]);
    expect(second.finished[0]).toMatchObject({
      status: 'processed',
      counts: { stored: 3, skipped: 0, failed: 0 },
    });
  });

  it('waits for running batches and gives up on stale ones', async () => {
    const running = setup({ pending: [pendingBatch()], batchStatus: 'in_progress' });
    await handleBatchMealPlans(post(), running.deps);
    expect(running.client.results).not.toHaveBeenCalled();
    expect(running.finished).toEqual([]);

    const stale = setup({
      pending: [pendingBatch({ createdAt: new Date('2026-09-28T10:00:00Z') })],
    });
    await handleBatchMealPlans(post(), stale.deps);
    expect(stale.client.get).not.toHaveBeenCalled();
    expect(stale.finished[0]).toMatchObject({ status: 'failed' });
  });

  it('tomorrowUtc', () => {
    expect(tomorrowUtc(new Date('2026-12-31T23:30:00Z'))).toBe('2027-01-01');
  });
});

describe('parseResults', () => {
  it('reads succeeded and errored lines, skipping junk', () => {
    const lines = [
      JSON.stringify({
        custom_id: U1,
        result: {
          type: 'succeeded',
          message: {
            model: 'claude-haiku-4-5',
            content: [
              { type: 'text', text: '{"a"' },
              { type: 'text', text: ':1}' },
            ],
            usage: { input_tokens: 5, output_tokens: 7 },
          },
        },
      }),
      'not json',
      JSON.stringify({ custom_id: U2, result: { type: 'errored', error: { type: 'x' } } }),
      '',
    ].join('\n');
    expect(parseResults(lines)).toEqual([
      {
        customId: U1,
        ok: true,
        text: '{"a":1}',
        model: 'claude-haiku-4-5',
        inputTokens: 5,
        outputTokens: 7,
      },
      { customId: U2, ok: false, text: '', model: '', inputTokens: 0, outputTokens: 0 },
    ]);
  });
});

describe('cachedSearch', () => {
  const fakeDb = (row: { foods: FoodResult[] } | null) => {
    const upserts: unknown[] = [];
    const query = {
      select: () => query,
      eq: () => query,
      gte: () => query,
      maybeSingle: async () => ({ data: row, error: null }),
      upsert: (v: unknown) => {
        upserts.push(v);
        return Promise.resolve({ error: null });
      },
    };
    return { db: { from: () => query } as never, upserts };
  };

  it('uses a fresh cached answer without calling USDA', async () => {
    const { db } = fakeDb({ foods: [usda.oats!] });
    const search = jest.fn(async () => []);
    expect(await cachedSearch(db, search)('  Oats ')).toEqual([usda.oats]);
    expect(search).not.toHaveBeenCalled();
  });

  it('calls USDA on a miss and caches non-empty answers', async () => {
    const { db, upserts } = fakeDb(null);
    const search = jest.fn(async (q: string) => (q === 'oats' ? [usda.oats!] : []));
    expect(await cachedSearch(db, search)('OATS')).toEqual([usda.oats]);
    expect(search).toHaveBeenCalledWith('oats');
    expect(upserts).toEqual([expect.objectContaining({ query: 'oats', foods: [usda.oats] })]);
    await cachedSearch(db, search)('nothing');
    expect(upserts).toHaveLength(1);
  });
});
