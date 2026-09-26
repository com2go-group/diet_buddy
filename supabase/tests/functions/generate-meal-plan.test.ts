import type { DietPrefs } from '../../functions/_shared/dietRules';
import type { LlmProvider, LlmRequest } from '../../functions/_shared/llm';
import type { FoodResult } from '../../functions/_shared/usda';
import {
  handleGenerateMealPlan,
  type MealPlanDeps,
  type MealPlanStore,
  type StoredPlan,
} from '../../functions/generate-meal-plan/handler';

const NOW = new Date('2026-09-27T10:00:00Z');
const DATE = '2026-09-27';
const noPrefs: DietPrefs = {
  dietStyles: [],
  restrictions: [],
  restrictionOther: null,
  allergies: [],
  allergyOther: null,
  avoidFoods: [],
};

const usda: Record<string, FoodResult> = Object.fromEntries(
  [
    ['oats', 'Oats, rolled, dry', 379, 13],
    ['blueberries raw', 'Blueberries, raw', 57, 0.7],
    ['chicken breast roasted', 'Chicken, breast, roasted', 165, 31],
    ['rice cooked', 'Rice, white, cooked', 130, 2.7],
    ['peanut butter', 'Peanut butter, smooth', 588, 25],
    ['apple', 'Apples, raw', 52, 0.3],
    ['lentils cooked', 'Lentils, cooked', 116, 9],
    ['broccoli', 'Broccoli, cooked', 35, 2.4],
  ].map(([q, name, kcal, p]) => [
    q as string,
    {
      ref: `usda:${q}`,
      name: name as string,
      brand: null,
      per100g: { kcal: kcal as number, proteinG: p as number, carbsG: 20, fatG: 3, fiberG: 2 },
      servings: [],
    },
  ]),
);

const item = (name: string, q: string, grams: number) => ({ name, usda_query: q, grams });
const planJson = (snack: ReturnType<typeof item>) =>
  JSON.stringify({
    meals: {
      breakfast: [item('Rolled oats', 'oats', 60), item('Blueberries', 'blueberries raw', 100)],
      lunch: [
        item('Roast chicken', 'chicken breast roasted', 150),
        item('Rice', 'rice cooked', 200),
      ],
      snack: [snack],
      dinner: [item('Lentils', 'lentils cooked', 250), item('Broccoli', 'broccoli', 150)],
    },
  });

function setup(opts: {
  prefs?: Partial<DietPrefs>;
  premium?: boolean;
  existing?: StoredPlan | null;
  replies: string[];
}) {
  const saved: { plan: unknown; regenerations: number }[] = [];
  const requests: LlmRequest[] = [];
  const store: MealPlanStore = {
    context: async () => ({
      premium: opts.premium ?? false,
      prefs: { ...noPrefs, ...opts.prefs },
      targets: { calories: 1800, proteinG: 140 },
    }),
    existing: async () => opts.existing ?? null,
    save: async (_u, _d, plan, regenerations) => void saved.push({ plan, regenerations }),
    callsSince: async () => 0,
    logUsage: async () => undefined,
  };
  const replies = [...opts.replies];
  const llm: LlmProvider = {
    complete: jest.fn(async (req: LlmRequest) => {
      requests.push({ ...req, messages: [...req.messages] });
      return {
        text: replies.shift() ?? '',
        model: 'claude-test',
        inputTokens: 10,
        outputTokens: 10,
      };
    }),
  };
  const deps: MealPlanDeps = {
    store,
    llm,
    now: () => NOW,
    getUserId: async () => 'user-1',
    searchFoods: async (q) => (usda[q] ? [usda[q]!] : []),
  };
  return { deps, saved, requests, llm };
}

const post = (body: object = { date: DATE }) =>
  new Request('http://x', { method: 'POST', body: JSON.stringify(body) });

describe('generate-meal-plan', () => {
  it('builds a plan with USDA numbers, scaled to the day’s target', async () => {
    const { deps, saved } = setup({ replies: [planJson(item('Apple', 'apple', 150))] });
    const res = await handleGenerateMealPlan(post(), deps);
    expect(res.status).toBe(200);
    const { plan } = await res.json();
    expect(plan.slots.lunch[0]).toMatchObject({
      name: 'Roast chicken',
      foodRef: 'usda:chicken breast roasted',
      source: 'Chicken, breast, roasted',
    });
    // Every number is USDA per-100 g × grams.
    for (const slot of ['breakfast', 'lunch', 'snack', 'dinner']) {
      for (const i of plan.slots[slot]) {
        const f = Object.values(usda).find((u) => u.ref === i.foodRef)!;
        expect(i.kcal).toBe(Math.round((f.per100g.kcal * i.grams) / 100));
      }
    }
    expect(Math.abs(plan.totals.kcal - 1800)).toBeLessThan(250);
    expect(saved).toHaveLength(1);
  });

  it('rejects a plan with an allergen and regenerates with feedback', async () => {
    const { deps, requests, saved } = setup({
      prefs: { allergies: ['peanuts'] },
      replies: [
        planJson(item('Peanut butter on toast', 'peanut butter', 30)),
        planJson(item('Apple', 'apple', 150)),
      ],
    });
    const res = await handleGenerateMealPlan(post(), deps);
    const { plan } = await res.json();
    expect(plan.slots.snack.map((i: { name: string }) => i.name)).toEqual(['Apple']);
    expect(requests).toHaveLength(2);
    expect(requests[1]!.messages.at(-1)!.content).toContain(
      '"Peanut butter on toast" breaks allergy peanuts',
    );
    expect(requests[0]!.system).toContain(
      'ALLERGIES — never include these or anything containing them: peanuts',
    );
    expect(saved).toHaveLength(1);
  });

  it('catches allergens hidden in the USDA food, not just the name', async () => {
    const { deps } = setup({
      prefs: { allergies: ['peanuts'] },
      replies: [
        planJson(item('Protein spread', 'peanut butter', 30)),
        planJson(item('Apple', 'apple', 150)),
      ],
    });
    const { plan } = await (await handleGenerateMealPlan(post(), deps)).json();
    expect(plan.slots.snack[0].name).toBe('Apple');
  });

  it('fails safely after three invalid attempts and saves nothing', async () => {
    const bad = planJson(item('Peanut butter', 'peanut butter', 30));
    const { deps, saved, llm } = setup({
      prefs: { allergies: ['peanuts'] },
      replies: [bad, 'not json', bad],
    });
    const res = await handleGenerateMealPlan(post(), deps);
    expect(await res.json()).toEqual({ error: 'generation_failed' });
    expect(llm.complete).toHaveBeenCalledTimes(3);
    expect(saved).toEqual([]);
  });

  it('asks again when a food has no USDA data', async () => {
    const { deps, requests } = setup({
      replies: [
        planJson(item('Dragon fruit bowl', 'dragon fruit exotic', 150)),
        planJson(item('Apple', 'apple', 150)),
      ],
    });
    await handleGenerateMealPlan(post(), deps);
    expect(requests[1]!.messages.at(-1)!.content).toContain(
      'no nutrition data found for "Dragon fruit bowl"',
    );
  });

  it('returns the stored plan, and only lets Premium regenerate', async () => {
    const existing: StoredPlan = { plan: { date: DATE } as never, regenerations: 0 };
    const free = setup({ existing, replies: [] });
    expect(await (await handleGenerateMealPlan(post(), free.deps)).json()).toEqual({
      plan: { date: DATE },
    });
    expect(
      await (
        await handleGenerateMealPlan(post({ date: DATE, regenerate: true }), free.deps)
      ).json(),
    ).toEqual({ error: 'premium_required' });
    const premium = setup({
      existing,
      premium: true,
      replies: [planJson(item('Apple', 'apple', 150))],
    });
    expect(
      (await handleGenerateMealPlan(post({ date: DATE, regenerate: true }), premium.deps)).status,
    ).toBe(200);
    expect(premium.saved[0]!.regenerations).toBe(1);
    const capped = setup({
      existing: { ...existing, regenerations: 3 },
      premium: true,
      replies: [],
    });
    expect(
      await (
        await handleGenerateMealPlan(post({ date: DATE, regenerate: true }), capped.deps)
      ).json(),
    ).toEqual({ error: 'regenerate_limit' });
  });

  it('plans today (±1 day for time zones); Premium also the next 7 days', async () => {
    const { deps } = setup({ replies: [] });
    expect((await handleGenerateMealPlan(post({ date: '2026-09-25' }), deps)).status).toBe(400);
    const future = await handleGenerateMealPlan(post({ date: '2026-10-01' }), deps);
    expect(await future.json()).toEqual({ error: 'premium_required' });
    expect((await handleGenerateMealPlan(post({ date: '2026-02-31' }), deps)).status).toBe(400);

    const premium = setup({ premium: true, replies: [planJson(item('Apple', 'apple', 150))] });
    const res = await handleGenerateMealPlan(post({ date: '2026-10-04' }), premium.deps);
    expect(res.status).toBe(200);
    expect((await res.json()).plan.date).toBe('2026-10-04');
    expect((await handleGenerateMealPlan(post({ date: '2026-10-06' }), premium.deps)).status).toBe(
      400,
    );
  });
});
