import { mealPlanSystemPrompt } from '../_prompts/mealPlan.v4.ts';
import type { BatchClient, BatchRequest, BatchResult } from '../_shared/anthropicBatch.ts';
import { fail, json } from '../_shared/http.ts';
import { languageField } from '../_shared/language.ts';
import type { LlmProvider } from '../_shared/llm.ts';
import type { FoodResult } from '../_shared/usda.ts';
import {
  assemblePlan,
  dayBefore,
  localizeDay,
  makeLookup,
  MAX_TOKENS,
  planFromReply,
  promptInput,
  type MealPlanContext,
} from '../generate-meal-plan/handler.ts';
import { leftoverLunch, type MealPlan } from '../generate-meal-plan/plan.ts';

/**
 * Tomorrow's meal plans for active free users, made overnight through Anthropic's Message
 * Batches API at half the price (decision log 2026-09-29). Run every few minutes by pg_cron
 * (docs/backend.md → Nightly meal plans):
 * 1. collects finished batches and stores their plans, a chunk per run (USDA numbers, diet and
 *    allergy checks, translation: the same code as generate-meal-plan). A reply that fails a
 *    check is dropped, never stored; the app then makes that plan on demand as before;
 * 2. once a day after `meal_plan_batch_hour_utc`, sends tomorrow's (UTC) requests for free users
 *    who used the app in the last 3 days and have no plan for that day yet.
 */

export interface BatchSettings {
  hourUtc: number;
  maxUsers: number;
  /** Results checked and stored at the same time. */
  parallel: number;
}

export const DEFAULT_SETTINGS: BatchSettings = { hourUtc: 17, maxUsers: 5000, parallel: 6 };

export interface Counts {
  stored: number;
  skipped: number;
  failed: number;
}

export interface PendingBatch {
  id: string;
  batchId: string;
  planDate: string;
  createdAt: Date;
  /** Results already handled (sorted by user ID), and what became of them. */
  offset: number;
  counts: Counts;
}

export interface BatchStore {
  settings(): Promise<BatchSettings>;
  /** Batches sent and not yet processed, oldest first. */
  pending(): Promise<PendingBatch[]>;
  hasBatch(date: string): Promise<boolean>;
  candidates(date: string, limit: number): Promise<{ userId: string; language: string | null }[]>;
  contexts(userIds: string[]): Promise<Map<string, MealPlanContext>>;
  record(batchId: string, date: string, count: number): Promise<void>;
  progress(id: string, offset: number, counts: Counts): Promise<void>;
  finish(id: string, status: 'processed' | 'failed', counts: Counts): Promise<void>;
  context(userId: string): Promise<MealPlanContext>;
  hasPlan(userId: string, date: string): Promise<boolean>;
  /** A stored plan (for leftovers: the day before). */
  planFor(userId: string, date: string): Promise<MealPlan | null>;
  /** Plans stored for these users on a date, by user. */
  plansOn(userIds: string[], date: string): Promise<Map<string, MealPlan>>;
  /** profiles.language, kept in step by the app. */
  languageOf(userId: string): Promise<string | null>;
  save(userId: string, date: string, plan: ReturnType<typeof assemblePlan>): Promise<void>;
  logUsage(
    userId: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    batch: boolean,
  ): Promise<void>;
}

export interface BatchDeps {
  secret: string | undefined;
  store: BatchStore;
  /** Null when ANTHROPIC_API_KEY or USDA_API_KEY is missing. */
  batch: BatchClient | null;
  /** Free users' model: the batch requests and the translations. */
  model: string;
  llm: LlmProvider | null;
  searchFoods(query: string): Promise<FoodResult[]>;
  now?: () => Date;
  /** Milliseconds since the run started (the chunk loop stops before the deadline). */
  elapsed?: () => number;
  deadlineMs?: number;
}

/** Stops taking new results after this long, well within the Edge Function time limit. */
export const DEADLINE_MS = 100_000;
/** Batches end within 24 hours; one that hasn't been processed after this is given up. */
export const GIVE_UP_HOURS = 30;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The UTC date after `now`, "YYYY-MM-DD". */
export const tomorrowUtc = (now: Date) =>
  new Date(now.getTime() + 86_400_000).toISOString().slice(0, 10);

export async function handleBatchMealPlans(req: Request, deps: BatchDeps): Promise<Response> {
  if (req.method !== 'POST') return fail('method_not_allowed', 405);
  if (!deps.secret || req.headers.get('Authorization') !== `Bearer ${deps.secret}`) {
    return fail('unauthorized', 401);
  }
  if (!deps.batch) return json({ ok: true, configured: false });
  try {
    const started = Date.now();
    const elapsed = deps.elapsed ?? (() => Date.now() - started);
    const now = deps.now?.() ?? new Date();
    const settings = await deps.store.settings();
    const collected = await collect(deps, deps.batch, settings, now, elapsed);
    const submitted = await submit(deps, deps.batch, settings, now);
    return json({ ok: true, ...collected, submitted });
  } catch (e) {
    console.error('batch-meal-plans failed', e);
    return fail('server_error', 500);
  }
}

async function collect(
  deps: BatchDeps,
  client: BatchClient,
  settings: BatchSettings,
  now: Date,
  elapsed: () => number,
): Promise<Counts & { processed: number }> {
  const total: Counts = { stored: 0, skipped: 0, failed: 0 };
  let processed = 0;
  const deadline = deps.deadlineMs ?? DEADLINE_MS;
  for (const pending of await deps.store.pending()) {
    if (elapsed() >= deadline) break;
    if (now.getTime() - pending.createdAt.getTime() > GIVE_UP_HOURS * 3_600_000) {
      await deps.store.finish(pending.id, 'failed', pending.counts);
      continue;
    }
    const status = await client.get(pending.batchId);
    if (status.status !== 'ended' || !status.resultsUrl) continue;
    const results = (await client.results(status.resultsUrl)).sort((a, b) =>
      a.customId < b.customId ? -1 : a.customId > b.customId ? 1 : 0,
    );
    const counts = { ...pending.counts };
    let offset = pending.offset;
    const step = Math.max(1, settings.parallel);
    while (offset < results.length && elapsed() < deadline) {
      const chunk = results.slice(offset, offset + step);
      const outcomes = await Promise.all(
        chunk.map((r) =>
          storeResult(deps, pending.planDate, r, now).catch((e: unknown) => {
            console.error('batch-meal-plans: a result failed', e);
            return 'failed' as const;
          }),
        ),
      );
      for (const o of outcomes) {
        counts[o]++;
        total[o]++;
      }
      offset += chunk.length;
    }
    if (offset >= results.length) {
      await deps.store.finish(pending.id, 'processed', counts);
      processed++;
    } else {
      await deps.store.progress(pending.id, offset, counts);
    }
  }
  return { ...total, processed };
}

/** One user's reply → a checked, translated plan, stored unless the user no longer needs it. */
async function storeResult(
  deps: BatchDeps,
  date: string,
  result: BatchResult,
  now: Date,
): Promise<keyof Counts> {
  if (!UUID.test(result.customId)) return 'failed';
  const userId = result.customId;
  if (result.inputTokens || result.outputTokens) {
    await deps.store.logUsage(
      userId,
      result.model || deps.model,
      result.inputTokens,
      result.outputTokens,
      true,
    );
  }
  if (!result.ok) return 'failed';
  // Made on demand meanwhile, or the user went Premium (their plans use the Premium model).
  if (await deps.store.hasPlan(userId, date)) return 'skipped';
  const ctx = await deps.store.context(userId);
  if (ctx.premium || !ctx.targets) return 'skipped';
  const leftover = ctx.cooking?.leftovers
    ? leftoverLunch(
        await deps.store.planFor(userId, dayBefore(date)),
        promptInput(ctx).slotCalories.lunch,
      )
    : null;
  const input = promptInput(
    ctx,
    leftover ? { leftoverLunch: leftover.dish.sourceTitle ?? leftover.dish.title } : {},
  );
  // The request was sent with a leftover lunch only if yesterday's dinner existed then; a
  // placeholder lunch without a leftover now (or the reverse) fails the checks and is dropped.
  const built = await planFromReply(result.text, ctx, input, makeLookup(deps));
  // No retry here: the app makes the plan on demand, with feedback, when the user opens Meals.
  if ('problems' in built) return 'failed';
  const language = languageField.parse(await deps.store.languageOf(userId));
  const local = await localizeDay(
    {
      store: {
        logUsage: (u, model, input, output) => deps.store.logUsage(u, model, input, output, false),
      },
    },
    deps.llm,
    userId,
    built.value,
    language,
    leftover,
  );
  if (await deps.store.hasPlan(userId, date)) return 'skipped';
  await deps.store.save(userId, date, assemblePlan(date, local, ctx, result.model, now));
  return 'stored';
}

/** Sends tomorrow's requests, once a day after the configured hour. Returns how many. */
async function submit(
  deps: BatchDeps,
  client: BatchClient,
  settings: BatchSettings,
  now: Date,
): Promise<number> {
  if (now.getUTCHours() < settings.hourUtc) return 0;
  const date = tomorrowUtc(now);
  if (await deps.store.hasBatch(date)) return 0;
  const candidates = await deps.store.candidates(date, settings.maxUsers);
  if (!candidates.length) return 0;
  const ids = candidates.map((c) => c.userId);
  const contexts = await deps.store.contexts(ids);
  // Today's plans, for users who reuse dinner as tomorrow's lunch.
  const today = await deps.store.plansOn(ids, dayBefore(date));
  const requests: BatchRequest[] = [];
  for (const { userId } of candidates) {
    const ctx = contexts.get(userId);
    if (!ctx || ctx.premium || !ctx.targets || !UUID.test(userId)) continue;
    const leftover = ctx.cooking?.leftovers
      ? leftoverLunch(today.get(userId) ?? null, promptInput(ctx).slotCalories.lunch)
      : null;
    const input = promptInput(
      ctx,
      leftover ? { leftoverLunch: leftover.dish.sourceTitle ?? leftover.dish.title } : {},
    );
    requests.push({
      custom_id: userId,
      params: {
        model: deps.model,
        max_tokens: MAX_TOKENS.free,
        system: mealPlanSystemPrompt(input),
        messages: [{ role: 'user', content: `Plan meals for ${date}.` }],
      },
    });
  }
  if (!requests.length) return 0;
  const created = await client.create(requests);
  await deps.store.record(created.id, date, requests.length);
  return requests.length;
}
