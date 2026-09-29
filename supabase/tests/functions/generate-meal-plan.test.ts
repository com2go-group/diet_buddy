import type { DietPrefs } from '../../functions/_shared/dietRules';
import type { LlmProvider, LlmRequest } from '../../functions/_shared/llm';
import type { FoodResult } from '../../functions/_shared/usda';
import {
  handleGenerateMealPlan,
  type MealPlanDeps,
  type MealPlanStore,
  type StoredPlan,
} from '../../functions/generate-meal-plan/handler';
import { fakeAllowance } from './allowance';

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
const meal = (title: string, ...ingredients: ReturnType<typeof item>[]) => ({
  title,
  description: 'Put it together on a plate.',
  ingredients,
});
const planJson = (snack: ReturnType<typeof item>, snackTitle = snack.name) =>
  JSON.stringify({
    meals: {
      breakfast: meal(
        'Oats with blueberries',
        item('Rolled oats', 'oats', 60),
        item('Blueberries', 'blueberries raw', 100),
      ),
      lunch: meal(
        'Chicken and rice',
        item('Roast chicken', 'chicken breast roasted', 150),
        item('Rice', 'rice cooked', 200),
      ),
      snack: meal(snackTitle, snack),
      dinner: meal(
        'Lentils with broccoli',
        item('Lentils', 'lentils cooked', 250),
        item('Broccoli', 'broccoli', 150),
      ),
    },
  });

function setup(opts: {
  prefs?: Partial<DietPrefs>;
  premium?: boolean;
  existing?: StoredPlan | null;
  replies: string[];
  boosts?: number;
  spentUsd?: number;
  freeLlm?: LlmProvider;
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
    freeLlm: opts.freeLlm,
    allowance: fakeAllowance({
      premium: opts.premium ?? false,
      boosts: opts.boosts ?? 0,
      spentUsd: opts.spentUsd ?? 0,
    }),
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
    expect(plan.dishes.lunch).toEqual({
      title: 'Chicken and rice',
      description: 'Put it together on a plate.',
    });
    expect(plan.version).toBe(2);
    expect(saved).toHaveLength(1);
  });

  it('translates what the user reads after the checks, keeping the English title', async () => {
    const english = [
      ...['Oats with blueberries', 'Put it together on a plate.', 'Rolled oats', 'Blueberries'],
      ...['Chicken and rice', 'Put it together on a plate.', 'Roast chicken', 'Rice'],
      ...['Apple', 'Put it together on a plate.', 'Apple'],
      ...['Lentils with broccoli', 'Put it together on a plate.', 'Lentils', 'Broccoli'],
    ];
    const { deps, requests } = setup({
      replies: [
        planJson(item('Apple', 'apple', 150)),
        JSON.stringify({ t: english.map((e) => `EL ${e}`) }),
      ],
    });
    const res = await handleGenerateMealPlan(post({ date: DATE, language: 'el' }), deps);
    const { plan } = await res.json();
    expect(requests[1]!.system).toContain('Greek');
    expect(JSON.parse(requests[1]!.messages[0]!.content as string)).toEqual(english);
    expect(plan.dishes.lunch).toEqual({
      title: 'EL Chicken and rice',
      description: 'EL Put it together on a plate.',
      sourceTitle: 'Chicken and rice',
    });
    expect(plan.slots.lunch[0]).toMatchObject({
      name: 'EL Roast chicken',
      source: 'Chicken, breast, roasted',
    });
  });

  it('keeps English when the translation doesn’t fit', async () => {
    const { deps } = setup({
      replies: [planJson(item('Apple', 'apple', 150)), JSON.stringify({ t: ['only one'] })],
    });
    const res = await handleGenerateMealPlan(post({ date: DATE, language: 'de' }), deps);
    const { plan } = await res.json();
    expect(plan.dishes.lunch.title).toBe('Chicken and rice');
  });

  it('checks the dish name too, not only the ingredients', async () => {
    const { deps, requests } = setup({
      prefs: { allergies: ['peanuts'] },
      replies: [
        planJson(item('Apple', 'apple', 150), 'Peanut apple slices'),
        planJson(item('Apple', 'apple', 150)),
      ],
    });
    const { plan } = await (await handleGenerateMealPlan(post(), deps)).json();
    expect(requests[1]!.messages.at(-1)!.content).toContain(
      '"Peanut apple slices" breaks allergy peanuts',
    );
    expect(plan.dishes.snack.title).toBe('Apple');
  });

  it('keeps recipe steps without amounts or calories, and checks them for allergens', async () => {
    const withSteps = (steps: string[]) => {
      const json = JSON.parse(planJson(item('Apple', 'apple', 150)));
      json.meals.snack.steps = steps;
      json.meals.snack.prep_minutes = 5;
      return JSON.stringify(json);
    };
    const { deps, requests } = setup({
      prefs: { allergies: ['peanuts'] },
      replies: [
        withSteps(['Slice the apple.', 'Spread with peanut butter.']),
        withSteps(['Slice 150 g of apple.', 'This snack has 80 kcal.', 'Enjoy with tea.']),
      ],
    });
    const { plan } = await (await handleGenerateMealPlan(post(), deps)).json();
    expect(requests[1]!.messages.at(-1)!.content).toContain('breaks allergy peanuts');
    expect(plan.dishes.snack).toMatchObject({
      steps: ['Slice apple.', 'Enjoy with tea.'],
      prepMinutes: 5,
    });
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

  it('says when the AI provider is failing, rather than blaming the diet rules', async () => {
    const { deps, saved } = setup({ replies: [] });
    deps.llm = {
      complete: jest.fn(async () => Promise.reject(new Error('401 invalid x-api-key'))),
    };
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await handleGenerateMealPlan(post(), deps);
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'ai_unavailable' });
    expect(error.mock.calls[0]![0]).toContain('AI provider failed');
    expect(saved).toEqual([]);
    error.mockRestore();
  });

  it('says when the food database is failing', async () => {
    const { deps } = setup({ replies: Array(3).fill(planJson(item('Apple', 'apple', 150))) });
    deps.searchFoods = async () => Promise.reject(new Error('USDA 403'));
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await handleGenerateMealPlan(post(), deps);
    expect(await res.json()).toEqual({ error: 'food_data_unavailable' });
    expect(error.mock.calls[0]![0]).toContain('food database failed');
    error.mockRestore();
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

  describe('one meal', () => {
    /** A stored version 2 plan, made the normal way. */
    async function storedPlan(): Promise<StoredPlan> {
      const first = setup({ replies: [planJson(item('Apple', 'apple', 150))] });
      await handleGenerateMealPlan(post(), first.deps);
      return first.saved[0] as unknown as StoredPlan;
    }
    const lentilSoup = JSON.stringify({
      meal: meal(
        'Lentil soup',
        item('Lentils', 'lentils cooked', 300),
        item('Broccoli', 'broccoli', 100),
      ),
    });

    it('gives another idea for one meal, different from earlier ones, and keeps the rest', async () => {
      const existing = await storedPlan();
      const { deps, saved, requests } = setup({ existing, replies: [lentilSoup] });
      const res = await handleGenerateMealPlan(
        post({ date: DATE, action: 'alternative', slot: 'lunch' }),
        deps,
      );
      expect(res.status).toBe(200);
      const { plan } = await res.json();
      expect(plan.dishes.lunch.title).toBe('Lentil soup');
      expect(plan.slots.lunch.map((i: { name: string }) => i.name)).toEqual([
        'Lentils',
        'Broccoli',
      ]);
      expect(plan.dishes.breakfast.title).toBe('Oats with blueberries');
      expect(plan.rejected.lunch).toEqual(['Chicken and rice']);
      expect(plan.alternatives).toBe(1);
      expect(requests[0]!.system).toContain('Chicken and rice');
      expect(saved[0]!.regenerations).toBe(existing.regenerations);
    });

    it('asks again when the same dish comes back', async () => {
      const existing = await storedPlan();
      const again = JSON.stringify({
        meal: meal('Chicken and rice', item('Roast chicken', 'chicken breast roasted', 150)),
      });
      const { deps, requests } = setup({ existing, replies: [again, lentilSoup] });
      const { plan } = await (
        await handleGenerateMealPlan(
          post({ date: DATE, action: 'alternative', slot: 'lunch' }),
          deps,
        )
      ).json();
      expect(requests[1]!.messages.at(-1)!.content).toContain('was already suggested');
      expect(plan.dishes.lunch.title).toBe('Lentil soup');
    });

    it('limits alternatives per day: one free, more with videos or Premium', async () => {
      const existing = await storedPlan();
      const used = { ...existing, plan: { ...existing.plan, alternatives: 1 } };
      const call = (d: MealPlanDeps) =>
        handleGenerateMealPlan(post({ date: DATE, action: 'alternative', slot: 'lunch' }), d);
      const free = setup({ existing: used, replies: [lentilSoup] });
      expect(await (await call(free.deps)).json()).toEqual({
        error: 'alternative_limit',
        limit: 1,
        adds: 1,
        boost: { target: expect.stringMatching(/:1$/), adds: 1 },
      });
      const boosted = setup({ existing: used, boosts: 1, replies: [lentilSoup] });
      expect((await call(boosted.deps)).status).toBe(200);
      const broke = setup({ existing, spentUsd: 1, replies: [lentilSoup] });
      expect(await (await call(broke.deps)).json()).toMatchObject({ error: 'ai_budget' });
      const tenth = { ...existing, plan: { ...existing.plan, alternatives: 10 } };
      const premium = setup({ existing: used, premium: true, replies: [lentilSoup] });
      expect((await call(premium.deps)).status).toBe(200);
      const premiumCapped = setup({ existing: tenth, premium: true, replies: [lentilSoup] });
      expect(await (await call(premiumCapped.deps)).json()).toEqual({ error: 'alternative_limit' });
    });

    it('plans free users on the cheaper model, and today’s plan needs no budget', async () => {
      const cheap = {
        complete: jest.fn(async () => ({
          text: planJson(item('Apple', 'apple', 150)),
          model: 'claude-haiku-4-5',
          inputTokens: 10,
          outputTokens: 10,
        })),
      };
      const { deps, llm } = setup({ replies: [], freeLlm: cheap, spentUsd: 1 });
      expect((await handleGenerateMealPlan(post(), deps)).status).toBe(200);
      expect(cheap.complete).toHaveBeenCalled();
      expect(llm.complete).not.toHaveBeenCalled();
    });

    it('skips a meal and undoes it, without a model call', async () => {
      const existing = await storedPlan();
      const { deps, llm, saved } = setup({ existing, replies: [] });
      const skipped = await (
        await handleGenerateMealPlan(post({ date: DATE, action: 'skip', slot: 'breakfast' }), deps)
      ).json();
      expect(skipped.plan.skipped).toEqual(['breakfast']);
      const again = setup({ existing: saved[0] as unknown as StoredPlan, replies: [] });
      const undone = await (
        await handleGenerateMealPlan(
          post({ date: DATE, action: 'unskip', slot: 'breakfast' }),
          again.deps,
        )
      ).json();
      expect(undone.plan.skipped).toEqual([]);
      expect(llm.complete).not.toHaveBeenCalled();
    });

    it('needs a meal, today’s date and an existing plan', async () => {
      const { deps } = setup({ replies: [] });
      expect(
        (await handleGenerateMealPlan(post({ date: DATE, action: 'skip' }), deps)).status,
      ).toBe(400);
      expect(
        (
          await handleGenerateMealPlan(
            post({ date: '2026-10-01', action: 'skip', slot: 'lunch' }),
            deps,
          )
        ).status,
      ).toBe(400);
      expect(
        await (
          await handleGenerateMealPlan(post({ date: DATE, action: 'skip', slot: 'lunch' }), deps)
        ).json(),
      ).toEqual({ error: 'no_plan' });
    });
  });

  it('lets free users plan tomorrow the evening before', async () => {
    const { deps } = setup({ replies: [planJson(item('Apple', 'apple', 150))] });
    const res = await handleGenerateMealPlan(post({ date: '2026-09-28' }), deps);
    expect(res.status).toBe(200);
    expect((await res.json()).plan.date).toBe('2026-09-28');
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
