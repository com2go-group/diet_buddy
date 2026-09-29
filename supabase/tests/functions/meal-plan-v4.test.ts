import {
  mealPlanSystemPrompt,
  swapIngredientSystemPrompt,
} from '../../functions/_prompts/mealPlan.v4';
import type { DietPrefs } from '../../functions/_shared/dietRules';
import type { LlmProvider, LlmRequest } from '../../functions/_shared/llm';
import type { FoodResult } from '../../functions/_shared/usda';
import {
  handleGenerateMealPlan,
  promptInput,
  type MealPlanContext,
  type MealPlanDeps,
  type StoredPlan,
} from '../../functions/generate-meal-plan/handler';
import {
  leftoverLunch,
  type MealPlan,
  type PlannedItem,
} from '../../functions/generate-meal-plan/plan';
import { fakeAllowance } from './allowance';

const NOW = new Date('2026-09-30T10:00:00Z');
const TODAY = '2026-09-30';
const YESTERDAY = '2026-09-29';
const noPrefs: DietPrefs = {
  dietStyles: [],
  restrictions: [],
  restrictionOther: null,
  allergies: [],
  allergyOther: null,
  avoidFoods: [],
};
const food = (q: string, name: string, kcal: number): FoodResult => ({
  ref: `usda:${q}`,
  name,
  brand: null,
  per100g: { kcal, proteinG: 20, carbsG: 10, fatG: 5, fiberG: 1 },
  servings: [],
});
const usda: Record<string, FoodResult> = {
  oats: food('oats', 'Oats, rolled, dry', 380),
  salmon: food('salmon', 'Fish, salmon, cooked', 200),
  chicken: food('chicken', 'Chicken, breast, roasted', 165),
  tofu: food('tofu', 'Tofu, firm', 145),
  rice: food('rice', 'Rice, white, cooked', 130),
  apple: food('apple', 'Apples, raw', 52),
  lentils: food('lentils', 'Lentils, cooked', 116),
  'peanut butter': food('peanut butter', 'Peanut butter, smooth', 588),
};
const pi = (name: string, q: string, grams: number): PlannedItem => {
  const f = usda[q]!;
  return {
    name,
    foodRef: f.ref,
    source: f.name,
    grams,
    kcal: Math.round((f.per100g.kcal * grams) / 100),
    proteinG: (f.per100g.proteinG * grams) / 100,
    carbsG: (f.per100g.carbsG * grams) / 100,
    fatG: (f.per100g.fatG * grams) / 100,
  };
};
const storedPlan = (over: Partial<MealPlan> = {}): MealPlan => ({
  version: 2,
  date: TODAY,
  slots: {
    breakfast: [pi('Oats', 'oats', 60)],
    lunch: [pi('Salmon', 'salmon', 150), pi('Rice', 'rice', 150)],
    snack: [pi('Apple', 'apple', 150)],
    dinner: [pi('Lentils', 'lentils', 300)],
  },
  dishes: {
    breakfast: { title: 'Porridge', description: '' },
    lunch: {
      title: 'Salmon rice bowl',
      description: 'Easy.',
      steps: ['Flake the Salmon over the rice.'],
    },
    snack: { title: 'Apple', description: '' },
    dinner: { title: 'Lentil stew', description: 'Hearty.', steps: ['Simmer.'] },
  },
  totals: { kcal: 1500, proteinG: 100, carbsG: 150, fatG: 40 },
  targets: { kcal: 1800, proteinG: 130 },
  promptVersion: 'mealPlan.v4',
  model: 'm',
  generatedAt: NOW.toISOString(),
  ...over,
});
const ctx = (over: Partial<MealPlanContext> = {}): MealPlanContext => ({
  premium: false,
  prefs: noPrefs,
  targets: { calories: 1800, proteinG: 130 },
  ...over,
});

function setup(opts: {
  plans?: Record<string, StoredPlan>;
  context?: MealPlanContext;
  replies: string[];
  freeSwaps?: number;
}) {
  const saved: MealPlan[] = [];
  const requests: LlmRequest[] = [];
  const replies = [...opts.replies];
  const llm: LlmProvider = {
    complete: jest.fn(async (req: LlmRequest) => {
      requests.push({ ...req, messages: [...req.messages] });
      return { text: replies.shift() ?? '', model: 'm', inputTokens: 1, outputTokens: 1 };
    }),
  };
  const deps: MealPlanDeps = {
    store: {
      context: async () => opts.context ?? ctx(),
      existing: async (_u, date) => opts.plans?.[date] ?? null,
      save: async (_u, _d, plan) => void saved.push(plan),
      callsSince: async () => 0,
      logUsage: async () => undefined,
    },
    llm,
    allowance: fakeAllowance({ premium: opts.context?.premium ?? false }),
    freeSwaps: async () => opts.freeSwaps ?? 3,
    now: () => NOW,
    getUserId: async () => 'user-1',
    searchFoods: async (q) => (usda[q] ? [usda[q]!] : []),
  };
  return { deps, saved, requests };
}
const post = (body: object) =>
  new Request('http://x', { method: 'POST', body: JSON.stringify(body) });

describe('meal plan v4 prompt', () => {
  it('adds cooking time, budget and cuisines', () => {
    const system = mealPlanSystemPrompt(
      promptInput(
        ctx({
          cooking: { time: 'quick', budget: 'low', cuisines: ['middle_eastern'], leftovers: true },
        }),
      ),
    );
    expect(system).toContain('15 minutes or less');
    expect(system).toContain('Budget: low');
    expect(system).toContain('middle eastern');
    expect(system).toContain("tomorrow's lunch");
  });
  it('asks for a replacement without amounts', () => {
    const s = swapIngredientSystemPrompt(
      promptInput(ctx()),
      'Salmon rice bowl',
      ['Salmon', 'Rice'],
      'Salmon',
    );
    expect(s).toContain('Replace: "Salmon"');
    expect(s).toContain('{"name":"...","usda_query":"..."}');
  });
});

describe('swap', () => {
  it('replaces one ingredient with a checked food of about the same calories', async () => {
    const { deps, saved } = setup({
      plans: { [TODAY]: { plan: storedPlan(), regenerations: 0 } },
      replies: [JSON.stringify({ name: 'Chicken', usda_query: 'chicken' })],
    });
    const res = await handleGenerateMealPlan(
      post({ date: TODAY, action: 'swap', slot: 'lunch', index: 0 }),
      deps,
    );
    expect(res.status).toBe(200);
    const { plan } = await res.json();
    expect(plan.slots.lunch[0]).toMatchObject({ name: 'Chicken', foodRef: 'usda:chicken' });
    expect(Math.abs(plan.slots.lunch[0].kcal - 300)).toBeLessThanOrEqual(10);
    expect(plan.dishes.lunch.steps).toEqual(['Flake the Chicken over the rice.']);
    expect(plan.dishes.lunch.swapped).toEqual([{ from: 'Salmon', to: 'Chicken' }]);
    expect(plan.swaps).toBe(1);
    expect(saved).toHaveLength(1);
  });

  it('rejects replacements that break allergies and retries', async () => {
    const { deps, requests } = setup({
      context: ctx({ prefs: { ...noPrefs, allergies: ['peanuts'] } }),
      plans: { [TODAY]: { plan: storedPlan(), regenerations: 0 } },
      replies: [
        JSON.stringify({ name: 'Peanut butter', usda_query: 'peanut butter' }),
        JSON.stringify({ name: 'Tofu', usda_query: 'tofu' }),
      ],
    });
    const { plan } = await (
      await handleGenerateMealPlan(
        post({ date: TODAY, action: 'swap', slot: 'lunch', index: 0 }),
        deps,
      )
    ).json();
    expect(requests[1]!.messages.at(-1)!.content).toContain('breaks allergy peanuts');
    expect(plan.slots.lunch[0].name).toBe('Tofu');
  });

  it('limits free swaps a day', async () => {
    const { deps } = setup({
      plans: { [TODAY]: { plan: storedPlan({ swaps: 3 }), regenerations: 0 } },
      replies: [],
    });
    const res = await handleGenerateMealPlan(
      post({ date: TODAY, action: 'swap', slot: 'lunch', index: 0 }),
      deps,
    );
    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe('swap_limit');
  });

  it('needs a valid ingredient', async () => {
    const { deps } = setup({
      plans: { [TODAY]: { plan: storedPlan(), regenerations: 0 } },
      replies: [],
    });
    const res = await handleGenerateMealPlan(
      post({ date: TODAY, action: 'swap', slot: 'lunch', index: 7 }),
      deps,
    );
    expect(res.status).toBe(400);
  });
});

describe('leftovers', () => {
  it('turns yesterday’s dinner into today’s lunch at lunch size', () => {
    const lunch = leftoverLunch(storedPlan(), 540)!;
    expect(lunch.dish).toMatchObject({ title: 'Lentil stew', leftover: true, prepMinutes: 5 });
    expect(lunch.dish.steps).toBeUndefined();
    expect(lunch.items[0]!.grams).toBe(465); // 348 kcal dinner × 1.55 (clamped ≤ 1.6)
    expect(leftoverLunch(storedPlan({ skipped: ['dinner'] }), 540)).toBeNull();
    expect(leftoverLunch(null, 540)).toBeNull();
  });

  it('plans the day around a leftover lunch', async () => {
    const meal = (title: string, q: string, grams: number) => ({
      title,
      description: '',
      ingredients: [{ name: title, usda_query: q, grams }],
    });
    const { deps, requests } = setup({
      context: ctx({ cooking: { time: 'any', budget: 'any', cuisines: [], leftovers: true } }),
      plans: { [YESTERDAY]: { plan: storedPlan({ date: YESTERDAY }), regenerations: 0 } },
      replies: [
        JSON.stringify({
          meals: {
            breakfast: meal('Porridge', 'oats', 60),
            lunch: {
              title: 'Leftovers',
              description: '',
              ingredients: [{ name: 'water', usda_query: 'water', grams: 1 }],
              steps: [],
            },
            snack: meal('Apple', 'apple', 150),
            dinner: meal('Chicken and rice', 'chicken', 200),
          },
        }),
      ],
    });
    const res = await handleGenerateMealPlan(post({ date: TODAY }), deps);
    expect(res.status).toBe(200);
    const { plan } = await res.json();
    expect(requests[0]!.system).toContain('leftovers of yesterday\'s dinner, "Lentil stew"');
    expect(plan.dishes.lunch).toMatchObject({ title: 'Lentil stew', leftover: true });
    expect(plan.slots.lunch[0].foodRef).toBe('usda:lentils');
  });
});
