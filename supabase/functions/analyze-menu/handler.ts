import { z } from 'npm:zod@4';

import { MENU_PROMPT_VERSION, MENU_SYSTEM_PROMPT, retryFeedback } from '../_prompts/menu.v1.ts';
import { findViolations, type DietPrefs } from '../_shared/dietRules.ts';
import { corsHeaders, fail, json } from '../_shared/http.ts';
import { BASE64, detectMediaType, stripJpegMetadata } from '../_shared/image.ts';
import {
  extractJson,
  type LlmContentBlock,
  type LlmMessage,
  type LlmProvider,
} from '../_shared/llm.ts';
import type { FoodResult } from '../_shared/usda.ts';
import { pickFood } from '../generate-meal-plan/plan.ts';
import { mealBudget, scoreDish, type Budget, type Slot } from './score.ts';

export interface MenuContext {
  premium: boolean;
  prefs: DietPrefs;
  targets: { calories: number; proteinG: number } | null;
}

export interface MenuStore {
  context(userId: string): Promise<MenuContext>;
  /** Calories and protein logged since `since` (the start of the user's local day). */
  eatenSince(userId: string, since: Date): Promise<{ kcal: number; proteinG: number }>;
  callsSince(userId: string, since: Date): Promise<number>;
  logUsage(userId: string, model: string, inputTokens: number, outputTokens: number): Promise<void>;
}

export interface MenuDeps {
  getUserId(req: Request): Promise<string | null>;
  store: MenuStore;
  llm: LlmProvider | null;
  searchFoods(query: string): Promise<FoodResult[]>;
  now?: () => Date;
}

export const MAX_BASE64_LENGTH = 5_000_000;
export const DAILY_CALL_CAP = 20;
export const MAX_ATTEMPTS = 2;
/** A dish needs this share of its grams matched in USDA to get numbers. */
export const MIN_MATCHED_SHARE = 0.6;

const requestSchema = z
  .object({
    slot: z.enum(['breakfast', 'lunch', 'snack', 'dinner']),
    tzOffsetMinutes: z.number().int().min(-840).max(840),
    image: z.string().min(100).max(MAX_BASE64_LENGTH).optional(),
    dishes: z.string().trim().min(2).max(2000).optional(),
  })
  .refine((r) => Boolean(r.image) !== Boolean(r.dishes));

const aiSchema = z.object({
  dishes: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        ingredients: z
          .array(
            z.object({
              name: z.string().trim().min(1).max(60),
              usda_query: z.string().trim().min(2).max(80),
              grams: z.number().positive().max(1500),
            }),
          )
          .min(1)
          .max(10),
      }),
    )
    .max(12),
});

export interface DishIngredient {
  name: string;
  grams: number;
  source: string | null;
}

export interface Dish {
  name: string;
  ingredients: DishIngredient[];
  /** Null when too little of the dish could be matched in USDA. */
  estimate: { kcal: number; proteinG: number; carbsG: number; fatG: number } | null;
  score: number;
  warnings: string[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * POST { slot, tzOffsetMinutes, image | dishes } → { dishes, budget }. Premium only. The model
 * reads the menu (or the typed dishes) and breaks each dish into typical ingredients; numbers
 * come from USDA; allergies/restrictions are checked in code; dishes are ranked by how well they
 * fit this meal's calories and protein. The photo is not stored.
 */
export async function handleAnalyzeMenu(req: Request, deps: MenuDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return fail('method_not_allowed', 405);
  try {
    const userId = await deps.getUserId(req);
    if (!userId) return fail('unauthorized', 401);
    const parsed = requestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail('invalid_request', 400);
    const { slot, tzOffsetMinutes, dishes: typed } = parsed.data;

    let photo: LlmContentBlock | null = null;
    if (parsed.data.image) {
      const image = parsed.data.image.replace(/^data:[^,]*,/, '').replace(/\s/g, '');
      const mediaType = detectMediaType(image);
      if (!mediaType || !BASE64.test(image)) return fail('invalid_image', 400);
      photo = {
        type: 'image',
        mediaType,
        base64: mediaType === 'image/jpeg' ? stripJpegMetadata(image) : image,
      };
    }

    const { store } = deps;
    const now = deps.now?.() ?? new Date();
    const ctx = await store.context(userId);
    if (!ctx.premium) return fail('premium_required', 403);
    if (!ctx.targets) return fail('no_targets', 409);
    if (!deps.llm) return fail('not_configured', 503);
    if ((await store.callsSince(userId, new Date(now.getTime() - 86_400_000))) >= DAILY_CALL_CAP) {
      return fail('rate_limited', 429);
    }

    // Start of the user's local day, as an instant.
    const localNow = new Date(now.getTime() + tzOffsetMinutes * 60_000);
    const dayStart = new Date(
      Date.parse(localNow.toISOString().slice(0, 10)) - tzOffsetMinutes * 60_000,
    );
    const budget: Budget = mealBudget(
      ctx.targets,
      await store.eatenSince(userId, dayStart),
      slot as Slot,
    );

    const messages: LlmMessage[] = [
      {
        role: 'user',
        content: photo
          ? [photo, { type: 'text', text: 'List the dishes on this menu.' }]
          : `Dishes I'm considering:\n${typed}`,
      },
    ];
    let parsedAi: z.infer<typeof aiSchema> | null = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS && !parsedAi; attempt++) {
      const result = await deps.llm
        .complete({ system: MENU_SYSTEM_PROMPT, messages, maxTokens: 2500 })
        .catch(() => null);
      if (!result) continue;
      await store.logUsage(userId, result.model, result.inputTokens, result.outputTokens);
      const ai = aiSchema.safeParse(extractJson(result.text));
      if (ai.success) parsedAi = ai.data;
      else {
        messages.push({ role: 'assistant', content: result.text });
        messages.push({ role: 'user', content: retryFeedback('the JSON was not valid') });
      }
    }
    if (!parsedAi) return fail('analysis_failed', 502);

    const cache = new Map<string, Promise<FoodResult | null>>();
    const lookup = (query: string) => {
      const key = query.toLowerCase();
      if (!cache.has(key)) {
        cache.set(
          key,
          deps
            .searchFoods(key)
            .then(pickFood)
            .catch(() => null),
        );
      }
      return cache.get(key)!;
    };

    const dishes: Dish[] = await Promise.all(
      parsedAi.dishes.map(async (d) => {
        const foods = await Promise.all(d.ingredients.map((i) => lookup(i.usda_query)));
        const totalGrams = d.ingredients.reduce((s, i) => s + i.grams, 0);
        let matchedGrams = 0;
        const sum = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
        d.ingredients.forEach((i, k) => {
          const f = foods[k];
          if (!f) return;
          matchedGrams += i.grams;
          const x = i.grams / 100;
          sum.kcal += f.per100g.kcal * x;
          sum.proteinG += f.per100g.proteinG * x;
          sum.carbsG += f.per100g.carbsG * x;
          sum.fatG += f.per100g.fatG * x;
        });
        const estimate =
          matchedGrams / totalGrams >= MIN_MATCHED_SHARE
            ? {
                kcal: Math.round(sum.kcal),
                proteinG: round1(sum.proteinG),
                carbsG: round1(sum.carbsG),
                fatG: round1(sum.fatG),
              }
            : null;
        // The dish name and every ingredient (with its USDA description) are checked.
        const warnings = [
          ...new Set(
            findViolations(
              [
                { slot: 'dish', name: d.name, source: '' },
                ...d.ingredients.map((i, k) => ({
                  slot: 'dish',
                  name: i.name,
                  source: foods[k]?.name ?? '',
                })),
              ],
              ctx.prefs,
            ).map((v) => v.reason),
          ),
        ];
        return {
          name: d.name,
          ingredients: d.ingredients.map((i, k) => ({
            name: i.name,
            grams: Math.round(i.grams),
            source: foods[k]?.name ?? null,
          })),
          estimate,
          score: estimate && !warnings.length ? scoreDish(estimate, budget) : 0,
          warnings,
        };
      }),
    );
    // Best fit first; dishes with warnings or no estimate go last.
    dishes.sort(
      (a, b) =>
        Number(a.warnings.length > 0) - Number(b.warnings.length > 0) ||
        Number(a.estimate === null) - Number(b.estimate === null) ||
        b.score - a.score,
    );
    return json({ dishes, budget, promptVersion: MENU_PROMPT_VERSION });
  } catch (e) {
    console.error('analyze-menu failed', e);
    return fail('server_error', 500);
  }
}
