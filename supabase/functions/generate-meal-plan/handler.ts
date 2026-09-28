import { z } from 'npm:zod@4';

import {
  alternativeMealSystemPrompt,
  MEAL_PLAN_PROMPT_VERSION,
  mealPlanSystemPrompt,
  retryFeedback,
  type MealPlanPromptInput,
} from '../_prompts/mealPlan.v2.ts';
import { findViolations, type DietPrefs } from '../_shared/dietRules.ts';
import { dayOffset } from '../_shared/dates.ts';
import { corsHeaders, fail, json } from '../_shared/http.ts';
import { extractJson, type LlmMessage, type LlmProvider } from '../_shared/llm.ts';
import type { FoodResult } from '../_shared/usda.ts';
import {
  aiMealSchema,
  aiPlanSchema,
  pickFood,
  scaleSlot,
  SLOT_SHARE,
  SLOTS,
  totals,
  type AiMeal,
  type Dish,
  type MealPlan,
  type PlannedItem,
  type Slot,
} from './plan.ts';

export interface MealPlanContext {
  premium: boolean;
  prefs: DietPrefs;
  targets: { calories: number; proteinG: number } | null;
}

export interface StoredPlan {
  plan: MealPlan;
  regenerations: number;
}

export interface MealPlanStore {
  context(userId: string): Promise<MealPlanContext>;
  existing(userId: string, date: string): Promise<StoredPlan | null>;
  save(userId: string, date: string, plan: MealPlan, regenerations: number): Promise<void>;
  /** Model calls made by this function for the user since `since` (cost cap). */
  callsSince(userId: string, since: Date): Promise<number>;
  logUsage(userId: string, model: string, inputTokens: number, outputTokens: number): Promise<void>;
}

export interface MealPlanDeps {
  getUserId(req: Request): Promise<string | null>;
  store: MealPlanStore;
  llm: LlmProvider | null;
  /** USDA search (server key). */
  searchFoods(query: string): Promise<FoodResult[]>;
  now?: () => Date;
}

const requestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  regenerate: z.boolean().optional(),
  /** plan (default): the day's plan. alternative: another idea for one meal. skip/unskip. */
  action: z.enum(['plan', 'alternative', 'skip', 'unskip']).optional(),
  slot: z.enum(SLOTS).optional(),
});

export const MAX_ATTEMPTS = 3;
export const PREMIUM_REGENERATIONS = 3;
export const DAILY_CALL_CAP = 15;
/** "Another idea" per day (each is a model call, so this also caps cost). */
export const FREE_ALTERNATIVES = 3;
export const PREMIUM_ALTERNATIVES = 10;

/** Premium can plan this many days ahead (for the week's grocery list). */
export const PREMIUM_DAYS_AHEAD = 7;

/** Plans can be made for "today" in any time zone (server date ±1 day). */
export function validDate(date: string, now: Date): boolean {
  const offset = dayOffset(date, now);
  return offset >= -1 && offset <= 1;
}

/** Premium: today in any time zone up to 7 days ahead. */
function validPremiumDate(date: string, now: Date): boolean {
  const offset = dayOffset(date, now);
  return offset >= -1 && offset <= PREMIUM_DAYS_AHEAD + 1;
}

/** Version 1 plans have no dish names: their ingredients stand in for the title. */
export function dishesOf(plan: MealPlan): Record<Slot, Dish> {
  return Object.fromEntries(
    SLOTS.map((s) => [
      s,
      plan.dishes?.[s] ?? {
        title: plan.slots[s].map((i) => i.name).join(', '),
        description: '',
      },
    ]),
  ) as Record<Slot, Dish>;
}

type Resolved = { name: string; food: FoodResult; grams: number }[];

/** USDA lookups for one request, remembering whether the food database itself failed. */
function makeLookup(deps: MealPlanDeps) {
  const cache = new Map<string, FoodResult | null>();
  const state = { error: null as unknown };
  const find = async (query: string) => {
    const key = query.toLowerCase();
    if (!cache.has(key)) {
      const found = await deps.searchFoods(key).catch((e: unknown) => {
        state.error = e;
        return [];
      });
      cache.set(key, pickFood(found));
    }
    return cache.get(key)!;
  };
  return { find, state };
}
type Lookup = ReturnType<typeof makeLookup>;

/** Ingredients → USDA foods, plus the problems to feed back to the model. */
async function resolveMeal(
  slot: Slot,
  meal: AiMeal,
  lookup: Lookup,
  prefs: DietPrefs,
): Promise<{ resolved: Resolved; problems: string[] }> {
  const problems: string[] = [];
  const resolved: Resolved = [];
  for (const item of meal.ingredients) {
    const food = await lookup.find(item.usda_query);
    if (!food) problems.push(`no nutrition data found for "${item.name}"`);
    else resolved.push({ name: item.name, food, grams: item.grams });
  }
  // The dish name and description are checked too (e.g. "Satay chicken" for a peanut allergy).
  const violations = findViolations(
    [
      { slot, name: meal.title, source: meal.description },
      ...resolved.map((i) => ({ slot, name: i.name, source: i.food.name })),
    ],
    prefs,
  );
  problems.push(...violations.map((v) => `"${v.name}" breaks ${v.reason.replace(':', ' ')}`));
  return { resolved, problems };
}

/**
 * Asks the model up to MAX_ATTEMPTS times, feeding problems back, until `build` accepts a reply.
 * A failure says whether the AI provider, the food database or the diet rules were the cause.
 */
async function attempt<T>(
  deps: MealPlanDeps & { llm: LlmProvider },
  userId: string,
  system: string,
  firstMessage: string,
  lookup: Lookup,
  build: (text: string) => Promise<{ value: T } | { problems: string[] }>,
): Promise<{ value: T; model: string } | { response: Response }> {
  const messages: LlmMessage[] = [{ role: 'user', content: firstMessage }];
  let aiError: unknown = null;
  let aiFailures = 0;
  let lastProblemCount = 0;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const result = await deps.llm
      .complete({ system, messages, maxTokens: 1500 })
      .catch((e: unknown) => {
        aiError = e;
        return null;
      });
    if (!result) {
      aiFailures++;
      continue;
    }
    await deps.store.logUsage(userId, result.model, result.inputTokens, result.outputTokens);
    messages.push({ role: 'assistant', content: result.text });
    const built = await build(result.text);
    if ('value' in built) return { value: built.value, model: result.model };
    lastProblemCount = built.problems.length;
    messages.push({ role: 'user', content: retryFeedback(built.problems) });
  }
  // No food names or diet details in the logs: they can reveal health or religious data.
  if (aiFailures === MAX_ATTEMPTS) {
    console.error('generate-meal-plan: the AI provider failed on every attempt', aiError);
    return { response: fail('ai_unavailable', 502) };
  }
  if (lookup.state.error) {
    console.error('generate-meal-plan: the food database failed', lookup.state.error);
    return { response: fail('food_data_unavailable', 502) };
  }
  console.warn(
    `generate-meal-plan: nothing passed the checks in ${MAX_ATTEMPTS} attempts (${lastProblemCount} problems in the last one)`,
  );
  return { response: fail('generation_failed', 502) };
}

function promptInput(ctx: MealPlanContext): MealPlanPromptInput {
  const targets = ctx.targets!;
  return {
    targets,
    slotCalories: Object.fromEntries(
      SLOTS.map((s) => [s, Math.round((targets.calories * SLOT_SHARE[s]) / 10) * 10]),
    ) as Record<Slot, number>,
    dietStyles: ctx.prefs.dietStyles.filter((d) => d !== 'no_preference'),
    restrictions: [
      ...ctx.prefs.restrictions.filter((r) => r !== 'other'),
      ...(ctx.prefs.restrictionOther ? [ctx.prefs.restrictionOther] : []),
    ],
    allergies: [
      ...ctx.prefs.allergies,
      ...(ctx.prefs.allergyOther ? [ctx.prefs.allergyOther] : []),
    ],
    avoid: ctx.prefs.avoidFoods.map((f) => f.replace(/_/g, ' ')),
  };
}

/**
 * POST { date, regenerate?, action?, slot? } → { plan }.
 * - plan (default): the day's plan. Dates: today in any time zone; Premium also the next 7 days
 *   (for the weekly grocery list). Returns the stored plan when there is one; otherwise generates:
 *   model picks a dish per meal → USDA numbers → allergy/restriction check in code (dish names
 *   too) → retry with feedback on any problem (up to 3 attempts) → portions scaled → stored.
 * - alternative + slot: another dish for one meal of today's plan, checked the same way and
 *   different from earlier suggestions; limited per day.
 * - skip / unskip + slot: marks a meal of today's plan as skipped (or not). No model call.
 */
export async function handleGenerateMealPlan(req: Request, deps: MealPlanDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return fail('method_not_allowed', 405);
  try {
    const userId = await deps.getUserId(req);
    if (!userId) return fail('unauthorized', 401);
    const parsed = requestSchema.safeParse(await req.json().catch(() => null));
    const now = deps.now?.() ?? new Date();
    if (
      !parsed.success ||
      Number.isNaN(Date.parse(parsed.data.date)) ||
      !validPremiumDate(parsed.data.date, now)
    ) {
      return fail('invalid_request', 400);
    }
    const { date, regenerate = false, action = 'plan', slot } = parsed.data;
    const { store } = deps;
    const existing = await store.existing(userId, date);

    if (action !== 'plan') {
      if (!slot || !validDate(date, now)) return fail('invalid_request', 400);
      if (!existing) return fail('no_plan', 404);
      if (action === 'skip' || action === 'unskip') {
        const others = (existing.plan.skipped ?? []).filter((s) => s !== slot);
        const plan: MealPlan = {
          ...existing.plan,
          skipped: action === 'skip' ? [...others, slot] : others,
        };
        await store.save(userId, date, plan, existing.regenerations);
        return json({ plan });
      }
      return await alternative(deps, userId, date, slot, existing, now);
    }

    if (existing && !regenerate) return json({ plan: existing.plan });

    const ctx = await store.context(userId);
    if (!validDate(date, now) && !ctx.premium) return fail('premium_required', 403);
    if (existing && (!ctx.premium || existing.regenerations >= PREMIUM_REGENERATIONS)) {
      return fail(ctx.premium ? 'regenerate_limit' : 'premium_required', 403);
    }
    if (!ctx.targets) return fail('no_targets', 409);
    if (!deps.llm) return fail('not_configured', 503);
    if ((await store.callsSince(userId, new Date(now.getTime() - 86_400_000))) >= DAILY_CALL_CAP) {
      return fail('rate_limited', 429);
    }

    const input = promptInput(ctx);
    const lookup = makeLookup(deps);
    const result = await attempt<{
      slots: Record<Slot, PlannedItem[]>;
      dishes: Record<Slot, Dish>;
    }>(
      { ...deps, llm: deps.llm },
      userId,
      mealPlanSystemPrompt(input),
      `Plan meals for ${date}.`,
      lookup,
      async (text) => {
        const ai = aiPlanSchema.safeParse(extractJson(text));
        if (!ai.success) return { problems: ['the JSON did not match the required format'] };
        const problems: string[] = [];
        const resolved = {} as Record<Slot, Resolved>;
        for (const s of SLOTS) {
          const meal = await resolveMeal(s, ai.data.meals[s], lookup, ctx.prefs);
          resolved[s] = meal.resolved;
          problems.push(...meal.problems);
        }
        if (problems.length) return { problems };
        const slots = Object.fromEntries(
          SLOTS.map((s) => [s, scaleSlot(resolved[s], input.slotCalories[s])]),
        ) as Record<Slot, PlannedItem[]>;
        const dishes = Object.fromEntries(
          SLOTS.map((s) => [
            s,
            { title: ai.data.meals[s].title, description: ai.data.meals[s].description },
          ]),
        ) as Record<Slot, Dish>;
        return { value: { slots, dishes } };
      },
    );
    if ('response' in result) return result.response;

    const plan: MealPlan = {
      version: 2,
      date,
      slots: result.value.slots,
      dishes: result.value.dishes,
      totals: totals(result.value.slots),
      targets: { kcal: ctx.targets.calories, proteinG: ctx.targets.proteinG },
      promptVersion: MEAL_PLAN_PROMPT_VERSION,
      model: result.model,
      generatedAt: now.toISOString(),
      // A new plan keeps the day's count of alternatives (cost cap).
      alternatives: existing?.plan.alternatives ?? 0,
    };
    await store.save(userId, date, plan, existing ? existing.regenerations + 1 : 0);
    return json({ plan });
  } catch (e) {
    console.error('generate-meal-plan failed', e);
    return fail('server_error', 500);
  }
}

/** "Another idea": replaces one meal of today's plan with a different, checked dish. */
async function alternative(
  deps: MealPlanDeps,
  userId: string,
  date: string,
  slot: Slot,
  existing: StoredPlan,
  now: Date,
): Promise<Response> {
  const ctx = await deps.store.context(userId);
  if (!ctx.targets) return fail('no_targets', 409);
  if (!deps.llm) return fail('not_configured', 503);
  const used = existing.plan.alternatives ?? 0;
  if (used >= (ctx.premium ? PREMIUM_ALTERNATIVES : FREE_ALTERNATIVES)) {
    return fail('alternative_limit', 403);
  }
  if (
    (await deps.store.callsSince(userId, new Date(now.getTime() - 86_400_000))) >= DAILY_CALL_CAP
  ) {
    return fail('rate_limited', 429);
  }

  const dishes = dishesOf(existing.plan);
  const rejected = existing.plan.rejected ?? {};
  const avoidTitles = [
    ...new Set([...(rejected[slot] ?? []), ...SLOTS.map((s) => dishes[s].title)]),
  ];
  const input = promptInput(ctx);
  const lookup = makeLookup(deps);
  const result = await attempt<{ items: PlannedItem[]; dish: Dish }>(
    { ...deps, llm: deps.llm },
    userId,
    alternativeMealSystemPrompt(input, slot, avoidTitles),
    `Suggest another ${slot} for ${date}.`,
    lookup,
    async (text) => {
      const ai = aiMealSchema.safeParse(extractJson(text));
      if (!ai.success) return { problems: ['the JSON did not match the required format'] };
      if (avoidTitles.some((t) => t.toLowerCase() === ai.data.meal.title.toLowerCase())) {
        return { problems: [`"${ai.data.meal.title}" was already suggested`] };
      }
      const meal = await resolveMeal(slot, ai.data.meal, lookup, ctx.prefs);
      if (meal.problems.length) return { problems: meal.problems };
      return {
        value: {
          items: scaleSlot(meal.resolved, input.slotCalories[slot]),
          dish: { title: ai.data.meal.title, description: ai.data.meal.description },
        },
      };
    },
  );
  if ('response' in result) return result.response;

  const slots = { ...existing.plan.slots, [slot]: result.value.items };
  const plan: MealPlan = {
    ...existing.plan,
    version: 2,
    slots,
    dishes: { ...dishes, [slot]: result.value.dish },
    totals: totals(slots),
    rejected: { ...rejected, [slot]: [...(rejected[slot] ?? []), dishes[slot].title] },
    skipped: (existing.plan.skipped ?? []).filter((s) => s !== slot),
    alternatives: used + 1,
  };
  await deps.store.save(userId, date, plan, existing.regenerations);
  return json({ plan });
}
