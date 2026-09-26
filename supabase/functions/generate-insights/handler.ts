import { z } from 'npm:zod@4';

import {
  INSIGHTS_PROMPT_VERSION,
  INSIGHTS_SYSTEM_PROMPT,
  retryFeedback,
} from '../_prompts/insights.v1.ts';
import { corsHeaders, fail, json } from '../_shared/http.ts';
import { extractJson, type LlmMessage, type LlmProvider } from '../_shared/llm.ts';
import { MIN_DAYS_LOGGED, summarise, windowDays, type RawData } from './aggregate.ts';
import { unsafeText } from './safety.ts';

export interface AiInsight {
  emoji: string;
  title: string;
  body: string;
}

export interface InsightsContext {
  premium: boolean;
  targets: { calories: number; proteinG: number; waterMl: number } | null;
  goalTypes: string[];
  /** Planned weekly weight change (kg; negative = loss). */
  weeklyChangeKg: number | null;
}

export interface InsightsStore {
  context(userId: string): Promise<InsightsContext>;
  existing(userId: string, day: string): Promise<AiInsight[] | null>;
  raw(userId: string, since: Date): Promise<RawData>;
  save(userId: string, day: string, insights: AiInsight[], model: string): Promise<void>;
  callsSince(userId: string, since: Date): Promise<number>;
  logUsage(userId: string, model: string, inputTokens: number, outputTokens: number): Promise<void>;
}

export interface InsightsDeps {
  getUserId(req: Request): Promise<string | null>;
  store: InsightsStore;
  llm: LlmProvider | null;
  now?: () => Date;
}

export const DAILY_CALL_CAP = 6;
export const MAX_ATTEMPTS = 2;

const requestSchema = z.object({
  /** Minutes to add to UTC for the user's local time (e.g. 120 in Berlin in summer). */
  tzOffsetMinutes: z.number().int().min(-840).max(840),
});

const aiSchema = z.object({
  insights: z
    .array(
      z.object({
        emoji: z.string().trim().min(1).max(8),
        title: z.string().trim().min(1).max(80),
        body: z.string().trim().min(1).max(400),
      }),
    )
    .min(1)
    .max(4),
});

/**
 * POST { tzOffsetMinutes } → { insights, day }. Premium only. Returns today's stored insights, or
 * generates them from the last 14 local days of aggregated numbers (at least 5 logged days),
 * screens them for restrictive advice in code, and stores them (one set per day).
 */
export async function handleGenerateInsights(req: Request, deps: InsightsDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return fail('method_not_allowed', 405);
  try {
    const userId = await deps.getUserId(req);
    if (!userId) return fail('unauthorized', 401);
    const parsed = requestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail('invalid_request', 400);
    const offset = parsed.data.tzOffsetMinutes;
    const now = deps.now?.() ?? new Date();
    const day = new Date(now.getTime() + offset * 60_000).toISOString().slice(0, 10);
    const { store } = deps;

    const ctx = await store.context(userId);
    if (!ctx.premium) return fail('premium_required', 403);
    const existing = await store.existing(userId, day);
    if (existing) return json({ day, insights: existing });
    if (!ctx.targets) return fail('no_targets', 409);

    const since = new Date(`${windowDays(now, offset)[0]}T00:00:00Z`);
    const summary = summarise(
      await store.raw(userId, new Date(since.getTime() - 86_400_000)),
      now,
      offset,
    );
    if (summary.daysLogged < MIN_DAYS_LOGGED) {
      return json({ day, insights: [], notEnoughData: true, daysLogged: summary.daysLogged });
    }
    if (!deps.llm) return fail('not_configured', 503);
    if ((await store.callsSince(userId, new Date(now.getTime() - 86_400_000))) >= DAILY_CALL_CAP) {
      return fail('rate_limited', 429);
    }

    const data = {
      targets: {
        dailyKcal: ctx.targets.calories,
        proteinG: ctx.targets.proteinG,
        waterMl: ctx.targets.waterMl,
      },
      goals: ctx.goalTypes,
      plannedWeeklyChangeKg: ctx.weeklyChangeKg,
      weightChange: summary.weight,
      days: summary.days,
    };
    const messages: LlmMessage[] = [{ role: 'user', content: JSON.stringify(data) }];
    let safe: AiInsight[] | null = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS && !safe; attempt++) {
      const result = await deps.llm
        .complete({ system: INSIGHTS_SYSTEM_PROMPT, messages, maxTokens: 900 })
        .catch(() => null);
      if (!result) continue;
      await store.logUsage(userId, result.model, result.inputTokens, result.outputTokens);
      messages.push({ role: 'assistant', content: result.text });
      const ai = aiSchema.safeParse(extractJson(result.text));
      if (!ai.success) {
        messages.push({ role: 'user', content: retryFeedback('the JSON was not valid') });
        continue;
      }
      const ok = ai.data.insights.filter((i) => !unsafeText(`${i.title} ${i.body}`));
      const lastAttempt = attempt === MAX_ATTEMPTS - 1;
      if (ok.length === ai.data.insights.length || (lastAttempt && ok.length)) {
        safe = ok;
        await store.save(userId, day, ok, result.model);
      } else {
        messages.push({
          role: 'user',
          content: retryFeedback(
            'some insights suggested restriction, fasting, skipping meals or supplements',
          ),
        });
      }
    }
    if (!safe) return fail('generation_failed', 502);
    return json({ day, insights: safe, promptVersion: INSIGHTS_PROMPT_VERSION });
  } catch (e) {
    console.error('generate-insights failed', e);
    return fail('server_error', 500);
  }
}
