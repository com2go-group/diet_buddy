import type { DietPrefs } from '../../functions/_shared/dietRules';
import type { LlmProvider, LlmRequest } from '../../functions/_shared/llm';
import type { FoodResult } from '../../functions/_shared/usda';
import { handleAnalyzeMenu, type MenuDeps } from '../../functions/analyze-menu/handler';
import { mealBudget, scoreDish } from '../../functions/analyze-menu/score';

const NOW = new Date('2026-09-27T10:00:00Z');
const noPrefs: DietPrefs = {
  dietStyles: [],
  restrictions: [],
  restrictionOther: null,
  allergies: [],
  allergyOther: null,
  avoidFoods: [],
};
const food = (q: string, name: string, kcal: number, p: number): FoodResult => ({
  ref: `usda:${q}`,
  name,
  brand: null,
  per100g: { kcal, proteinG: p, carbsG: 10, fatG: 5, fiberG: 1 },
  servings: [],
});
const usda: Record<string, FoodResult> = {
  'chicken breast grilled': food('c', 'Chicken, breast, grilled', 165, 31),
  'salad greens': food('s', 'Lettuce, green', 15, 1.4),
  'caesar dressing': food('d', 'Salad dressing, caesar', 540, 2),
  'parmesan cheese': food('p', 'Cheese, parmesan', 390, 36),
  'pizza cheese': food('z', 'Pizza, cheese', 270, 11),
  'satay sauce': food('y', 'Sauce, peanut', 250, 8),
  'beef steak grilled': food('b', 'Beef, steak, grilled', 250, 26),
  'french fries': food('f', 'Potatoes, french fried', 312, 3.4),
};
const ing = (name: string, q: string, grams: number) => ({ name, usda_query: q, grams });
const menu = JSON.stringify({
  dishes: [
    {
      name: 'Margherita pizza',
      ingredients: [ing('Pizza', 'pizza cheese', 350)],
    },
    {
      name: 'Chicken Caesar salad',
      ingredients: [
        ing('Grilled chicken', 'chicken breast grilled', 150),
        ing('Romaine', 'salad greens', 120),
        ing('Caesar dressing', 'caesar dressing', 40),
        ing('Parmesan', 'parmesan cheese', 15),
      ],
    },
    {
      name: 'Chicken satay',
      ingredients: [ing('Chicken', 'chicken breast grilled', 150), ing('Satay', 'satay sauce', 60)],
    },
    {
      name: 'Chef’s mystery special',
      ingredients: [ing('Mystery', 'mystery thing', 300), ing('Fries', 'french fries', 50)],
    },
  ],
});

function setup(opts: {
  replies: string[];
  prefs?: Partial<DietPrefs>;
  premium?: boolean;
  eaten?: { kcal: number; proteinG: number };
  calls?: number;
}) {
  const requests: LlmRequest[] = [];
  const replies = [...opts.replies];
  const usage: number[] = [];
  const eatenSince: Date[] = [];
  const llm: LlmProvider = {
    complete: jest.fn(async (req: LlmRequest) => {
      requests.push({ ...req, messages: [...req.messages] });
      return { text: replies.shift() ?? '', model: 'claude-test', inputTokens: 1, outputTokens: 1 };
    }),
  };
  const deps: MenuDeps = {
    llm,
    now: () => NOW,
    getUserId: async () => 'user-1',
    searchFoods: async (q) => (usda[q] ? [usda[q]!] : []),
    store: {
      context: async () => ({
        premium: opts.premium ?? true,
        prefs: { ...noPrefs, ...opts.prefs },
        targets: { calories: 2000, proteinG: 140 },
      }),
      eatenSince: async (_u, since) => (
        eatenSince.push(since),
        opts.eaten ?? { kcal: 0, proteinG: 0 }
      ),
      callsSince: async () => opts.calls ?? 0,
      logUsage: async () => void usage.push(1),
    },
  };
  return { deps, requests, usage, eatenSince };
}

const post = (body: object) =>
  new Request('http://x', {
    method: 'POST',
    body: JSON.stringify({ slot: 'lunch', tzOffsetMinutes: 120, ...body }),
  });

describe('meal budget and scoring', () => {
  it('uses the meal’s share, lowered to what is left, but never tiny', () => {
    expect(mealBudget({ calories: 2000, proteinG: 140 }, { kcal: 0 }, 'lunch')).toEqual({
      kcal: 600,
      proteinG: 42,
    });
    expect(mealBudget({ calories: 2000, proteinG: 140 }, { kcal: 1600 }, 'dinner')).toEqual({
      kcal: 400,
      proteinG: 49,
    });
    expect(mealBudget({ calories: 2000, proteinG: 140 }, { kcal: 2400 }, 'dinner').kcal).toBe(180);
  });

  it('rewards dishes near the budget with good protein', () => {
    const budget = { kcal: 600, proteinG: 42 };
    expect(scoreDish({ kcal: 580, proteinG: 45 }, budget)).toBe(100);
    expect(scoreDish({ kcal: 950, proteinG: 30 }, budget)).toBeLessThan(
      scoreDish({ kcal: 600, proteinG: 30 }, budget),
    );
    expect(scoreDish({ kcal: 150, proteinG: 5 }, budget)).toBeLessThan(40);
  });
});

describe('analyze-menu', () => {
  it('estimates dishes from USDA ingredients and ranks them against this meal', async () => {
    const { deps, requests, eatenSince } = setup({
      replies: [menu],
      prefs: { allergies: ['peanuts'] },
    });
    const res = await handleAnalyzeMenu(
      post({ dishes: 'Margherita pizza\nChicken Caesar salad' }),
      deps,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.budget).toEqual({ kcal: 600, proteinG: 42 });
    expect(body.dishes.map((d: { name: string }) => d.name)).toEqual([
      'Chicken Caesar salad',
      'Margherita pizza',
      'Chef’s mystery special',
      'Chicken satay',
    ]);
    const salad = body.dishes[0];
    // 150 g chicken (247.5) + 120 g greens (18) + 40 g dressing (216) + 15 g parmesan (58.5)
    expect(salad.estimate.kcal).toBe(540);
    expect(salad.estimate.proteinG).toBeCloseTo(46.5 + 1.7 + 0.8 + 5.4, 0);
    expect(salad.score).toBeGreaterThan(body.dishes[1].score);
    expect(salad.ingredients[0]).toEqual({
      name: 'Grilled chicken',
      grams: 150,
      source: 'Chicken, breast, grilled',
    });
    // Too little matched → no numbers.
    expect(body.dishes[2]).toMatchObject({ estimate: null, score: 0 });
    // The allergen is flagged, scored 0 and listed last.
    expect(body.dishes[3]).toMatchObject({ warnings: ['allergy:peanuts'], score: 0 });
    // Local day start in Berlin (UTC+2) = 22:00 UTC the day before.
    expect(eatenSince[0]!.toISOString()).toBe('2026-09-26T22:00:00.000Z');
    expect(requests[0]!.messages[0]!.content).toContain('Margherita pizza');
    expect(requests[0]!.system).toContain('Do not state calories');
  });

  it('flags kosher meat + dairy in one dish', async () => {
    const { deps } = setup({ replies: [menu], prefs: { restrictions: ['kosher'] } });
    const body = await (await handleAnalyzeMenu(post({ dishes: 'salad' }), deps)).json();
    const salad = body.dishes.find((d: { name: string }) => d.name === 'Chicken Caesar salad');
    expect(salad.warnings).toContain('restriction:kosher_mixing');
  });

  it('reads a menu photo without its metadata', async () => {
    const seg = String.fromCharCode(0xff, 0xe1, 0x00, 0x08) + 'GPS51N';
    const jpeg = btoa(
      '\xff\xd8' + seg + '\xff\xdb\x00\x68qq' + 'x'.repeat(100) + '\xff\xda\x00\x02data',
    );
    const { deps, requests } = setup({ replies: ['{"dishes":[]}'] });
    const res = await handleAnalyzeMenu(post({ image: jpeg }), deps);
    expect(res.status).toBe(200);
    expect((await res.json()).dishes).toEqual([]);
    const content = requests[0]!.messages[0]!.content as { type: string; base64?: string }[];
    expect(atob(content[0]!.base64!)).not.toContain('GPS');
  });

  it('validates input, Premium and limits', async () => {
    const { deps } = setup({ replies: [] });
    expect((await handleAnalyzeMenu(post({}), deps)).status).toBe(400);
    expect(
      (await handleAnalyzeMenu(post({ dishes: 'x y', image: 'A'.repeat(200) }), deps)).status,
    ).toBe(400);
    expect(
      (await handleAnalyzeMenu(post({ image: 'PHN2Zz4' + 'A'.repeat(200) }), deps)).status,
    ).toBe(400);
    const free = setup({ replies: [], premium: false });
    expect((await handleAnalyzeMenu(post({ dishes: 'pizza' }), free.deps)).status).toBe(403);
    const capped = setup({ replies: [], calls: 20 });
    expect((await handleAnalyzeMenu(post({ dishes: 'pizza' }), capped.deps)).status).toBe(429);
    const noKey = setup({ replies: [] });
    expect(
      (await handleAnalyzeMenu(post({ dishes: 'pizza' }), { ...noKey.deps, llm: null })).status,
    ).toBe(503);
  });

  it('retries once on invalid JSON, then fails gracefully', async () => {
    const ok = setup({ replies: ['nope', menu] });
    expect((await handleAnalyzeMenu(post({ dishes: 'pizza' }), ok.deps)).status).toBe(200);
    expect(ok.usage).toHaveLength(2);
    const bad = setup({ replies: ['nope', 'nope'] });
    expect((await handleAnalyzeMenu(post({ dishes: 'pizza' }), bad.deps)).status).toBe(502);
  });
});
