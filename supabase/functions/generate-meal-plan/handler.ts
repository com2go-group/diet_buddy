import { z } from 'npm:zod@4';

import {
  MEAL_PLAN_PROMPT_VERSION,
  mealPlanSystemPrompt,
  retryFeedback,
} from '../_prompts/mealPlan.v1.ts';
import { findViolations, type DietPrefs } from '../_shared/dietRules.ts';
import { dayOffset } from '../_shared/dates.ts';
import { corsHeaders, fail, json } from '../_shared/http.ts';
import { extractJson, type LlmMessage, type LlmProvider } from '../_shared/llm.ts';
import type { FoodResult } from '../_shared/usda.ts';
import {
  aiPlanSchema,
  pickFood,
  scaleSlot,
  SLOT_SHARE,
  SLOTS,
  totals,
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
});

export const MAX_ATTEMPTS = 3;
export const PREMIUM_REGENERATIONS = 3;
export const DAILY_CALL_CAP = 15;

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

/**
 * POST { date, regenerate? } → { plan }. Dates: today in any time zone; Premium also the next 7
 * days (for the weekly grocery list). Returns the stored plan when there is one; otherwise
 * generates: model picks foods → USDA numbers → allergy/restriction check in code → retry with
 * feedback on any problem (up to 3 attempts) → portions scaled to the targets → stored.
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
    const { date, regenerate = false } = parsed.data;
    const { store } = deps;

    const existing = await store.existing(userId, date);
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

    const slotCalories = Object.fromEntries(
      SLOTS.map((s) => [s, Math.round((ctx.targets!.calories * SLOT_SHARE[s]) / 10) * 10]),
    ) as Record<Slot, number>;
    const system = mealPlanSystemPrompt({
      targets: ctx.targets,
      slotCalories,
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
    });

    const messages: LlmMessage[] = [{ role: 'user', content: `Plan meals for ${date}.` }];
    const cache = new Map<string, FoodResult | null>();
    const lookup = async (query: string) => {
      const key = query.toLowerCase();
      if (!cache.has(key)) cache.set(key, pickFood(await deps.searchFoods(key).catch(() => [])));
      return cache.get(key)!;
    };

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const result = await deps.llm
        .complete({ system, messages, maxTokens: 1200 })
        .catch(() => null);
      if (!result) continue;
      await store.logUsage(userId, result.model, result.inputTokens, result.outputTokens);
      messages.push({ role: 'assistant', content: result.text });

      const ai = aiPlanSchema.safeParse(extractJson(result.text));
      if (!ai.success) {
        messages.push({
          role: 'user',
          content: retryFeedback(['the JSON did not match the required format']),
        });
        continue;
      }
      const problems: string[] = [];
      const resolved: Record<Slot, { name: string; food: FoodResult; grams: number }[]> = {
        breakfast: [],
        lunch: [],
        snack: [],
        dinner: [],
      };
      for (const slot of SLOTS) {
        for (const item of ai.data.meals[slot]) {
          const food = await lookup(item.usda_query);
          if (!food) problems.push(`no nutrition data found for "${item.name}"`);
          else resolved[slot].push({ name: item.name, food, grams: item.grams });
        }
      }
      const violations = findViolations(
        SLOTS.flatMap((slot) =>
          resolved[slot].map((i) => ({ slot, name: i.name, source: i.food.name })),
        ),
        ctx.prefs,
      );
      problems.push(...violations.map((v) => `"${v.name}" breaks ${v.reason.replace(':', ' ')}`));
      if (problems.length) {
        messages.push({ role: 'user', content: retryFeedback(problems) });
        continue;
      }

      const slots = Object.fromEntries(
        SLOTS.map((s) => [s, scaleSlot(resolved[s], slotCalories[s])]),
      ) as Record<Slot, PlannedItem[]>;
      const plan: MealPlan = {
        version: 1,
        date,
        slots,
        totals: totals(slots),
        targets: { kcal: ctx.targets.calories, proteinG: ctx.targets.proteinG },
        promptVersion: MEAL_PLAN_PROMPT_VERSION,
        model: result.model,
        generatedAt: now.toISOString(),
      };
      await store.save(userId, date, plan, existing ? existing.regenerations + 1 : 0);
      return json({ plan });
    }
    return fail('generation_failed', 502);
  } catch (e) {
    console.error('generate-meal-plan failed', e);
    return fail('server_error', 500);
  }
}
