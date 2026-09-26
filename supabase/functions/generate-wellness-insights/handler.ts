import { z } from 'npm:zod@4';

import {
  retryFeedback,
  WELLNESS_PROMPT_VERSION,
  WELLNESS_SYSTEM_PROMPT,
  WELLNESS_THEMES,
} from '../_prompts/wellness.v1.ts';
import { corsHeaders, fail, json } from '../_shared/http.ts';
import { extractJson, type LlmMessage, type LlmProvider } from '../_shared/llm.ts';
import {
  combineFlags,
  screenMessage,
  SUPPORT_NOTES,
  type SafetyFlag,
} from '../coach-chat/safety.ts';
import { unsafeText } from '../generate-insights/safety.ts';
import { quotesMessages } from './privacy.ts';

export interface WellnessInsight {
  emoji: string;
  theme: (typeof WELLNESS_THEMES)[number];
  title: string;
  body: string;
}

export interface WellnessSet {
  periodStart: string;
  periodEnd: string;
  insights: WellnessInsight[];
  messagesAnalysed: number;
  createdAt: string;
}

export interface UserMessage {
  persona: 'aria' | 'max' | 'luna';
  created_at: string;
  content: string;
}

export interface WellnessStore {
  premium(userId: string): Promise<boolean>;
  consented(userId: string): Promise<boolean>;
  latest(userId: string): Promise<WellnessSet | null>;
  /** The user's own coach messages since `since`, newest first. */
  messages(userId: string, since: Date): Promise<UserMessage[]>;
  save(userId: string, set: Omit<WellnessSet, 'createdAt'>, model: string): Promise<WellnessSet>;
  callsSince(userId: string, since: Date): Promise<number>;
  logUsage(userId: string, model: string, inputTokens: number, outputTokens: number): Promise<void>;
}

export interface WellnessDeps {
  getUserId(req: Request): Promise<string | null>;
  store: WellnessStore;
  llm: LlmProvider | null;
  now?: () => Date;
}

/** Days of messages analysed, and how often a new set is made. */
export const WINDOW_DAYS = 14;
export const REFRESH_DAYS = 7;
export const MIN_MESSAGES = 5;
export const MAX_MESSAGES = 200;
export const MAX_MESSAGE_CHARS = 600;
export const MAX_TOTAL_CHARS = 15_000;
export const DAILY_CALL_CAP = 4;
export const MAX_ATTEMPTS = 2;

const requestSchema = z.object({
  tzOffsetMinutes: z.number().int().min(-840).max(840),
});

const aiSchema = z.object({
  safety: z.enum(['none', 'disordered_eating', 'crisis', 'medical']),
  insights: z
    .array(
      z.object({
        emoji: z.string().trim().min(1).max(8),
        theme: z.enum(WELLNESS_THEMES),
        title: z.string().trim().min(1).max(80),
        body: z.string().trim().min(1).max(400),
      }),
    )
    .max(4),
});

const addDays = (day: string, n: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

function support(flag: 'crisis' | 'disordered_eating'): Response {
  return json({ status: 'support', flag, note: SUPPORT_NOTES[flag] });
}

const needsSupport = (flag: SafetyFlag): flag is 'crisis' | 'disordered_eating' =>
  flag === 'crisis' || flag === 'disordered_eating';

/**
 * POST { tzOffsetMinutes } → { status: 'ok' | 'support' | 'not_enough', … }. Premium and the
 * separate `coach_insights` consent only. Themes from the user's own coach messages of the last
 * 14 days, one new set per week. Messages are screened in code first: any sign of disordered
 * eating or crisis returns a professional-help note instead of insights. Model output is
 * rejected when it gives restrictive advice or quotes the user; only the insights are stored.
 */
export async function handleWellnessInsights(req: Request, deps: WellnessDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return fail('method_not_allowed', 405);
  try {
    const userId = await deps.getUserId(req);
    if (!userId) return fail('unauthorized', 401);
    const parsed = requestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail('invalid_request', 400);
    const offset = parsed.data.tzOffsetMinutes;
    const now = deps.now?.() ?? new Date();
    const today = new Date(now.getTime() + offset * 60_000).toISOString().slice(0, 10);
    const { store } = deps;

    if (!(await store.premium(userId))) return fail('premium_required', 403);
    if (!(await store.consented(userId))) return fail('consent_required', 403);

    const since = new Date(now.getTime() - WINDOW_DAYS * 86_400_000);
    const messages = (await store.messages(userId, since)).slice(0, MAX_MESSAGES);
    const screened = messages
      .map((m) => screenMessage(m.content))
      .reduce<SafetyFlag>((a, b) => combineFlags(a, b), 'none');
    if (needsSupport(screened)) return support(screened);

    const latest = await store.latest(userId);
    if (latest && latest.periodEnd > addDays(today, -REFRESH_DAYS)) {
      return json({ status: 'ok', ...latest });
    }
    if (messages.length < MIN_MESSAGES) {
      return latest
        ? json({ status: 'ok', ...latest })
        : json({ status: 'not_enough', messageCount: messages.length, needed: MIN_MESSAGES });
    }
    if (!deps.llm) return fail('not_configured', 503);
    if ((await store.callsSince(userId, new Date(now.getTime() - 86_400_000))) >= DAILY_CALL_CAP) {
      return fail('rate_limited', 429);
    }

    // Newest first until the budget is used, then back in time order. No replies, no profile.
    const picked: UserMessage[] = [];
    let chars = 0;
    for (const m of messages) {
      const text = m.content.slice(0, MAX_MESSAGE_CHARS);
      if (chars + text.length > MAX_TOTAL_CHARS) break;
      chars += text.length;
      picked.push({ ...m, content: text });
    }
    picked.reverse();
    const payload = picked.map((m) => ({
      coach: m.persona,
      date: new Date(Date.parse(m.created_at) + offset * 60_000).toISOString().slice(0, 10),
      text: m.content,
    }));
    const texts = picked.map((m) => m.content);

    const chat: LlmMessage[] = [{ role: 'user', content: JSON.stringify({ messages: payload }) }];
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const result = await deps.llm
        .complete({ system: WELLNESS_SYSTEM_PROMPT, messages: chat, maxTokens: 900 })
        .catch(() => null);
      if (!result) continue;
      await store.logUsage(userId, result.model, result.inputTokens, result.outputTokens);
      chat.push({ role: 'assistant', content: result.text });
      const ai = aiSchema.safeParse(extractJson(result.text));
      if (!ai.success) {
        chat.push({ role: 'user', content: retryFeedback('the JSON was not valid') });
        continue;
      }
      if (needsSupport(ai.data.safety)) return support(ai.data.safety);
      const ok = ai.data.insights.filter(
        (i) =>
          !unsafeText(`${i.title} ${i.body}`) && !quotesMessages(`${i.title} ${i.body}`, texts),
      );
      const lastAttempt = attempt === MAX_ATTEMPTS - 1;
      if (ok.length && (ok.length === ai.data.insights.length || lastAttempt)) {
        const saved = await store.save(
          userId,
          {
            periodStart: addDays(today, -(WINDOW_DAYS - 1)),
            periodEnd: today,
            insights: ok,
            messagesAnalysed: picked.length,
          },
          result.model,
        );
        return json({ status: 'ok', ...saved, promptVersion: WELLNESS_PROMPT_VERSION });
      }
      chat.push({
        role: 'user',
        content: retryFeedback(
          ai.data.insights.length
            ? 'some insights quoted the user or suggested restriction, fasting, skipping meals or supplements'
            : 'there were no insights',
        ),
      });
    }
    return fail('generation_failed', 502);
  } catch (e) {
    console.error('generate-wellness-insights failed', e);
    return fail('server_error', 500);
  }
}
