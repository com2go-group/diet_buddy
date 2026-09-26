import { z } from 'npm:zod@4';

import {
  FOOD_PHOTO_PROMPT_VERSION,
  FOOD_PHOTO_SYSTEM_PROMPT,
  retryFeedback,
} from '../_prompts/foodPhoto.v1.ts';
import { findViolations, type DietPrefs } from '../_shared/dietRules.ts';
import { corsHeaders, fail, json } from '../_shared/http.ts';
import { BASE64, detectMediaType, stripJpegMetadata } from '../_shared/image.ts';
import { extractJson, type LlmMessage, type LlmProvider } from '../_shared/llm.ts';
import type { FoodResult } from '../_shared/usda.ts';
import { pickFood } from '../generate-meal-plan/plan.ts';

export { detectMediaType, stripJpegMetadata };

export interface FoodPhotoStore {
  isPremium(userId: string): Promise<boolean>;
  prefs(userId: string): Promise<DietPrefs>;
  /** Free-tier scans per day, from app_config. */
  dailyLimit(): Promise<number>;
  /** Scans (one ai_usage row each) by this user since `since`. */
  scansSince(userId: string, since: Date): Promise<number>;
  logUsage(userId: string, model: string, inputTokens: number, outputTokens: number): Promise<void>;
}

export interface FoodPhotoDeps {
  getUserId(req: Request): Promise<string | null>;
  store: FoodPhotoStore;
  llm: LlmProvider | null;
  /** USDA search of generic foods (server key). */
  searchFoods(query: string): Promise<FoodResult[]>;
  now?: () => Date;
}

/** ~3.7 MB of image data; the app sends a compressed JPEG well under this. */
export const MAX_BASE64_LENGTH = 5_000_000;
export const DEFAULT_DAILY_LIMIT = 3;
/** Cost cap for everyone, Premium included. */
export const PREMIUM_DAILY_LIMIT = 30;
export const MAX_ATTEMPTS = 2;

const requestSchema = z.object({ image: z.string().min(100).max(MAX_BASE64_LENGTH) });

const aiSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        usda_query: z.string().trim().min(2).max(80),
        grams: z.number().positive().max(2000),
        confidence: z.enum(['high', 'medium', 'low']).catch('low'),
      }),
    )
    .max(8),
});

export interface PhotoItem {
  name: string;
  grams: number;
  confidence: 'high' | 'medium' | 'low';
  /** USDA food the numbers come from, or null when nothing matched. */
  food: FoodResult | null;
  /** dietRules reasons, e.g. "allergy:peanuts": shown as warnings, the user decides. */
  warnings: string[];
}

/**
 * POST { image: base64 } → { items, remaining }. The photo is sent to the vision model and then
 * discarded (never stored). The model names foods and estimates grams; numbers come from USDA;
 * each item is checked against the user's allergies, restrictions and avoided foods and flagged.
 * Free users get a few scans a day (app_config), Premium a higher cost cap.
 */
export async function handleAnalyzeFoodPhoto(req: Request, deps: FoodPhotoDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return fail('method_not_allowed', 405);
  try {
    const userId = await deps.getUserId(req);
    if (!userId) return fail('unauthorized', 401);
    const parsed = requestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail('invalid_request', 400);
    const image = parsed.data.image.replace(/^data:[^,]*,/, '').replace(/\s/g, '');
    const mediaType = detectMediaType(image);
    if (!mediaType || !BASE64.test(image)) return fail('invalid_image', 400);
    const cleanImage = mediaType === 'image/jpeg' ? stripJpegMetadata(image) : image;
    if (!deps.llm) return fail('not_configured', 503);

    const { store } = deps;
    const now = deps.now?.() ?? new Date();
    const [premium, freeLimit, used] = await Promise.all([
      store.isPremium(userId),
      store.dailyLimit(),
      store.scansSince(userId, new Date(now.getTime() - 86_400_000)),
    ]);
    const limit = premium ? PREMIUM_DAILY_LIMIT : freeLimit;
    if (used >= limit) return fail(premium ? 'rate_limited' : 'limit_reached', 429);

    const messages: LlmMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'image', mediaType, base64: cleanImage },
          { type: 'text', text: 'List the foods in this photo.' },
        ],
      },
    ];
    const usage = { model: '', input: 0, output: 0 };
    let items: z.infer<typeof aiSchema>['items'] | null = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS && !items; attempt++) {
      const result = await deps.llm
        .complete({ system: FOOD_PHOTO_SYSTEM_PROMPT, messages, maxTokens: 600 })
        .catch(() => null);
      if (!result) continue;
      usage.model = result.model;
      usage.input += result.inputTokens;
      usage.output += result.outputTokens;
      const ai = aiSchema.safeParse(extractJson(result.text));
      if (ai.success) items = ai.data.items;
      else {
        messages.push({ role: 'assistant', content: result.text });
        messages.push({ role: 'user', content: retryFeedback('the JSON was not valid') });
      }
    }
    // One usage row per scan (it is also the scan counter), whatever the number of attempts.
    if (usage.model) await store.logUsage(userId, usage.model, usage.input, usage.output);
    if (!items) return fail('analysis_failed', 502);

    const prefs = await store.prefs(userId);
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
    const resolved: PhotoItem[] = await Promise.all(
      items.map(async (i) => {
        const food = await lookup(i.usda_query);
        const warnings = findViolations(
          [{ slot: 'photo', name: i.name, source: food?.name ?? '' }],
          prefs,
        ).map((v) => v.reason);
        return {
          name: i.name,
          grams: Math.max(5, Math.round(i.grams / 5) * 5),
          confidence: i.confidence,
          food,
          warnings,
        };
      }),
    );
    // Kosher meat + dairy on one plate is a warning on the plate, not on one item.
    const plate = findViolations(
      resolved.map((i) => ({ slot: 'photo', name: i.name, source: i.food?.name ?? '' })),
      prefs,
    ).filter((v) => v.reason === 'restriction:kosher_mixing');

    return json({
      items: resolved,
      plateWarnings: plate.map((v) => v.reason),
      remaining: premium ? null : Math.max(0, limit - used - 1),
      promptVersion: FOOD_PHOTO_PROMPT_VERSION,
    });
  } catch (e) {
    console.error('analyze-food-photo failed', e);
    return fail('server_error', 500);
  }
}
