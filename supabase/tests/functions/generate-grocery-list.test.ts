import type { LlmProvider, LlmRequest } from '../../functions/_shared/llm';
import {
  handleGenerateGroceryList,
  weekDates,
  type GroceryDeps,
  type StoredList,
} from '../../functions/generate-grocery-list/handler';
import { ingredientsFrom, type PlanItem } from '../../functions/generate-grocery-list/list';

const NOW = new Date('2026-09-27T10:00:00Z');
const item = (name: string, ref: string, grams: number): PlanItem => ({
  name,
  foodRef: ref,
  source: `USDA ${name}`,
  grams,
});
const plans = [
  {
    date: '2026-09-27',
    slots: {
      breakfast: [item('Rolled oats', 'usda:1', 60)],
      lunch: [item('Chicken breast', 'usda:2', 150), item('Brown rice', 'usda:3', 180)],
      snack: [],
      dinner: [item('Chicken thigh stir-fry', 'usda:2', 120)],
    },
  },
  {
    date: '2026-09-28',
    slots: { breakfast: [item('Oats', 'usda:1', 70)], lunch: [], snack: [], dinner: [] },
  },
];

function setup(opts: {
  replies: string[];
  premium?: boolean;
  existing?: StoredList | null;
  plans?: typeof plans;
  calls?: number;
}) {
  const saved: StoredList[] = [];
  const requests: LlmRequest[] = [];
  const planDates: string[][] = [];
  const replies = [...opts.replies];
  const llm: LlmProvider = {
    complete: jest.fn(async (req: LlmRequest) => {
      requests.push({ ...req, messages: [...req.messages] });
      return { text: replies.shift() ?? '', model: 'claude-test', inputTokens: 1, outputTokens: 1 };
    }),
  };
  const deps: GroceryDeps = {
    llm,
    now: () => NOW,
    getUserId: async () => 'user-1',
    store: {
      isPremium: async () => opts.premium ?? true,
      existing: async () => opts.existing ?? null,
      plans: async (_u, dates) => (planDates.push(dates), opts.plans ?? plans),
      save: async (_u, list) => void saved.push(list),
      callsSince: async () => opts.calls ?? 0,
      logUsage: async () => undefined,
    },
  };
  return { deps, saved, requests, planDates };
}

const post = (body: object = { startDate: '2026-09-27' }) =>
  new Request('http://x', { method: 'POST', body: JSON.stringify(body) });

const aiReply = JSON.stringify({
  items: [
    { id: 'usda:1', aisle: 'grains_pasta', buy: '500 g bag', cost: 1.2 },
    { id: 'usda:2', aisle: 'meat_fish', buy: '300 g pack', cost: 4.5 },
    { id: 'usda:999', aisle: 'produce', buy: 'invented', cost: 99 },
  ],
});

describe('ingredientsFrom', () => {
  it('sums grams by USDA food across meals and days', () => {
    expect(ingredientsFrom(plans)).toEqual([
      { id: 'usda:3', name: 'Brown rice', source: 'USDA Brown rice', grams: 180, days: 1 },
      { id: 'usda:2', name: 'Chicken breast', source: 'USDA Chicken breast', grams: 270, days: 1 },
      { id: 'usda:1', name: 'Rolled oats', source: 'USDA Rolled oats', grams: 130, days: 2 },
    ]);
  });

  it('covers a week from the start date', () => {
    expect(weekDates('2026-09-27')).toEqual([
      '2026-09-27',
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
    ]);
  });
});

describe('generate-grocery-list', () => {
  it('keeps our amounts and adds aisle, pack and price from the model', async () => {
    const { deps, saved, requests, planDates } = setup({ replies: [aiReply] });
    const res = await handleGenerateGroceryList(post(), deps);
    expect(res.status).toBe(200);
    const { list } = await res.json();
    expect(planDates[0]).toHaveLength(7);
    expect(list).toMatchObject({ startDate: '2026-09-27', days: 2, currency: 'EUR', checked: [] });
    expect(list.items).toEqual([
      expect.objectContaining({ id: 'usda:3', grams: 180, aisle: 'other', buy: null, cost: null }),
      expect.objectContaining({ id: 'usda:2', grams: 270, aisle: 'meat_fish', cost: 4.5 }),
      expect.objectContaining({
        id: 'usda:1',
        grams: 130,
        aisle: 'grains_pasta',
        buy: '500 g bag',
      }),
    ]);
    // The invented item is ignored; the total is the sum of known prices.
    expect(list.estimatedCost).toBe(5.7);
    expect(saved).toHaveLength(1);
    expect(JSON.parse(requests[0]!.messages[0]!.content as string)).toEqual([
      { id: 'usda:3', name: 'Brown rice', usda: 'USDA Brown rice', grams: 180 },
      { id: 'usda:2', name: 'Chicken breast', usda: 'USDA Chicken breast', grams: 270 },
      { id: 'usda:1', name: 'Rolled oats', usda: 'USDA Rolled oats', grams: 130 },
    ]);
  });

  it('coerces unknown aisles and bad prices instead of failing', async () => {
    const { deps } = setup({
      replies: [
        JSON.stringify({ items: [{ id: 'usda:1', aisle: 'spaceship', buy: 'x', cost: -3 }] }),
      ],
    });
    const { list } = await (await handleGenerateGroceryList(post(), deps)).json();
    expect(list.items.find((i: { id: string }) => i.id === 'usda:1')).toMatchObject({
      aisle: 'other',
      cost: null,
    });
  });

  it('returns the stored list unless asked to regenerate', async () => {
    const existing: StoredList = {
      startDate: '2026-09-27',
      days: 7,
      items: [],
      estimatedCost: 10,
      currency: 'EUR',
      checked: ['usda:1'],
    };
    const cached = setup({ replies: [], existing });
    expect((await (await handleGenerateGroceryList(post(), cached.deps)).json()).list).toEqual(
      existing,
    );
    expect(cached.requests).toHaveLength(0);
    const fresh = setup({ replies: [aiReply], existing });
    await handleGenerateGroceryList(
      post({ startDate: '2026-09-27', regenerate: true }),
      fresh.deps,
    );
    expect(fresh.saved[0]!.checked).toEqual([]);
  });

  it('needs meal plans, Premium, a valid week start and a model', async () => {
    const none = setup({ replies: [], plans: [] });
    expect(await (await handleGenerateGroceryList(post(), none.deps)).json()).toEqual({
      error: 'no_plans',
    });
    const free = setup({ replies: [], premium: false });
    expect((await handleGenerateGroceryList(post(), free.deps)).status).toBe(403);
    const later = setup({ replies: [] });
    expect(
      (await handleGenerateGroceryList(post({ startDate: '2026-10-04' }), later.deps)).status,
    ).toBe(400);
    const capped = setup({ replies: [], calls: 6 });
    expect((await handleGenerateGroceryList(post(), capped.deps)).status).toBe(429);
    const noKey = setup({ replies: [] });
    expect((await handleGenerateGroceryList(post(), { ...noKey.deps, llm: null })).status).toBe(
      503,
    );
  });

  it('retries once on invalid JSON, then fails gracefully', async () => {
    const ok = setup({ replies: ['nope', aiReply] });
    expect((await handleGenerateGroceryList(post(), ok.deps)).status).toBe(200);
    const bad = setup({ replies: ['nope', 'still nope'] });
    const res = await handleGenerateGroceryList(post(), bad.deps);
    expect(res.status).toBe(502);
    expect(bad.saved).toHaveLength(0);
  });
});
