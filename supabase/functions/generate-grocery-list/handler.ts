import { z } from 'npm:zod@4';

import { AISLES, GROCERY_PROMPT_VERSION, grocerySystemPrompt } from '../_prompts/grocery.v1.ts';
import { dayOffset } from '../_shared/dates.ts';
import { corsHeaders, fail, json } from '../_shared/http.ts';
import { extractJson, type LlmMessage, type LlmProvider } from '../_shared/llm.ts';
import { ingredientsFrom, totalCost, type GroceryItem, type PlanItem } from './list.ts';

export interface StoredList {
  startDate: string;
  days: number;
  items: GroceryItem[];
  estimatedCost: number | null;
  currency: string;
  checked: string[];
}

export interface GroceryStore {
  isPremium(userId: string): Promise<boolean>;
  existing(userId: string, startDate: string): Promise<StoredList | null>;
  plans(
    userId: string,
    dates: string[],
  ): Promise<{ date: string; slots: Record<string, PlanItem[]> }[]>;
  save(userId: string, list: StoredList, model: string): Promise<void>;
  callsSince(userId: string, since: Date): Promise<number>;
  logUsage(userId: string, model: string, inputTokens: number, outputTokens: number): Promise<void>;
}

export interface GroceryDeps {
  getUserId(req: Request): Promise<string | null>;
  store: GroceryStore;
  llm: LlmProvider | null;
  currency?: string;
  now?: () => Date;
}

export const WEEK_DAYS = 7;
export const DAILY_CALL_CAP = 6;
export const MAX_ATTEMPTS = 2;

const requestSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  regenerate: z.boolean().optional(),
});

const aiSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        aisle: z.enum(AISLES).catch('other'),
        buy: z.string().trim().max(60).nullable().catch(null),
        cost: z.number().min(0).max(200).nullable().catch(null),
      }),
    )
    .max(200),
});

export function weekDates(startDate: string): string[] {
  const start = Date.parse(startDate);
  return Array.from({ length: WEEK_DAYS }, (_, i) =>
    new Date(start + i * 86_400_000).toISOString().slice(0, 10),
  );
}

/**
 * POST { startDate, regenerate? } → { list }. Premium only. Builds the week's shopping list from
 * the stored meal plans for startDate … +6 days: amounts are summed in code; the model only adds
 * the aisle, a pack to buy and a rough price. Stored per week; regenerating resets the ticks.
 */
export async function handleGenerateGroceryList(
  req: Request,
  deps: GroceryDeps,
): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return fail('method_not_allowed', 405);
  try {
    const userId = await deps.getUserId(req);
    if (!userId) return fail('unauthorized', 401);
    const parsed = requestSchema.safeParse(await req.json().catch(() => null));
    const now = deps.now?.() ?? new Date();
    if (!parsed.success || Math.abs(dayOffset(parsed.data.startDate, now)) > 1) {
      return fail('invalid_request', 400);
    }
    const { startDate, regenerate = false } = parsed.data;
    const { store } = deps;
    if (!(await store.isPremium(userId))) return fail('premium_required', 403);

    const existing = await store.existing(userId, startDate);
    if (existing && !regenerate) return json({ list: existing });

    const plans = await store.plans(userId, weekDates(startDate));
    const ingredients = ingredientsFrom(plans);
    if (!ingredients.length) return fail('no_plans', 409);
    if (!deps.llm) return fail('not_configured', 503);
    if ((await store.callsSince(userId, new Date(now.getTime() - 86_400_000))) >= DAILY_CALL_CAP) {
      return fail('rate_limited', 429);
    }

    const currency = deps.currency ?? 'EUR';
    const messages: LlmMessage[] = [
      {
        role: 'user',
        content: JSON.stringify(
          ingredients.map((i) => ({ id: i.id, name: i.name, usda: i.source, grams: i.grams })),
        ),
      },
    ];
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const result = await deps.llm
        .complete({ system: grocerySystemPrompt(currency), messages, maxTokens: 2500 })
        .catch(() => null);
      if (!result) continue;
      await store.logUsage(userId, result.model, result.inputTokens, result.outputTokens);
      const ai = aiSchema.safeParse(extractJson(result.text));
      if (!ai.success) {
        messages.push({ role: 'assistant', content: result.text });
        messages.push({
          role: 'user',
          content: 'That JSON did not match the format. Reply with the JSON only.',
        });
        continue;
      }
      // Our ingredient list is the source of truth: unknown ids are ignored, missing ones kept.
      const byId = new Map(ai.data.items.map((i) => [i.id, i]));
      const items: GroceryItem[] = ingredients.map((i) => {
        const extra = byId.get(i.id);
        return {
          ...i,
          aisle: extra?.aisle ?? 'other',
          buy: extra?.buy || null,
          cost: extra?.cost ?? null,
        };
      });
      const list: StoredList = {
        startDate,
        days: plans.length,
        items,
        estimatedCost: totalCost(items),
        currency,
        checked: [],
      };
      await store.save(userId, list, result.model);
      return json({ list, promptVersion: GROCERY_PROMPT_VERSION });
    }
    return fail('generation_failed', 502);
  } catch (e) {
    console.error('generate-grocery-list failed', e);
    return fail('server_error', 500);
  }
}
