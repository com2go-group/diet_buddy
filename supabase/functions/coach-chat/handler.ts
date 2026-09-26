import { z } from 'npm:zod@4';

import { COACH_PROMPT_VERSION, coachSystemPrompt, type Persona } from '../_prompts/coach.v1.ts';
import { corsHeaders, fail, json } from '../_shared/http.ts';
import { extractJson, type LlmMessage, type LlmProvider } from '../_shared/llm.ts';
import { buildCoachContext, type CoachContextData } from './context.ts';
import { combineFlags, screenMessage, withSupportNote, type SafetyFlag } from './safety.ts';

export const requestSchema = z.object({
  persona: z.enum(['aria', 'max', 'luna']),
  message: z.string().trim().min(1).max(2000),
  conversationId: z.uuid().nullish(),
  /** Date.getTimezoneOffset() on the device, so "today" matches the user's day. */
  timezoneOffset: z.number().int().min(-840).max(840).optional(),
});

const replySchema = z.object({
  reply: z.string().trim().min(1).max(4000),
  safety: z.enum(['none', 'disordered_eating', 'crisis', 'medical']).catch('none'),
});

export interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

/** Database access for the coach, implemented with the service-role client in store.ts. */
export interface CoachStore {
  isPremium(userId: string): Promise<boolean>;
  dailyLimit(): Promise<number>;
  /** User messages sent since `since` (for the free-tier daily limit and burst limit). */
  countUserMessagesSince(userId: string, since: Date): Promise<number>;
  loadContext(userId: string, dayStart: Date): Promise<CoachContextData>;
  /** The conversation's persona, or null if it isn't this user's. */
  conversationPersona(userId: string, conversationId: string): Promise<Persona | null>;
  createConversation(userId: string, persona: Persona, title: string): Promise<string>;
  history(conversationId: string, limit: number): Promise<LlmMessage[]>;
  saveExchange(
    userId: string,
    conversationId: string,
    persona: Persona,
    userText: string,
    reply: string,
  ): Promise<{ user: StoredMessage; assistant: StoredMessage }>;
  logUsage(userId: string, model: string, inputTokens: number, outputTokens: number): Promise<void>;
  /** Records that a reply was flagged (flag and persona only, never the text) for admin review. */
  recordSafetyEvent(
    userId: string,
    persona: Persona,
    flag: Exclude<SafetyFlag, 'none'>,
  ): Promise<void>;
}

export interface CoachDeps {
  getUserId(req: Request): Promise<string | null>;
  store: CoachStore;
  llm: LlmProvider | null;
  now?: () => Date;
}

const BURST_LIMIT_PER_MINUTE = 6;
const HISTORY_MESSAGES = 12;

/** The user's local wall-clock time as a Date whose UTC fields read as local time. */
export function localNow(now: Date, timezoneOffset = 0): Date {
  return new Date(now.getTime() - timezoneOffset * 60_000);
}

/** Start of the user's local day, as a real instant. */
export function localDayStart(now: Date, timezoneOffset = 0): Date {
  const local = localNow(now, timezoneOffset);
  const midnightLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return new Date(midnightLocal + timezoneOffset * 60_000);
}

/**
 * POST { persona, message, conversationId?, timezoneOffset? }
 *   → { conversationId, messages: [user, assistant], remaining, safety }
 * Limits and safety are enforced here, not in the app (CLAUDE.md §7.7, §9, §11).
 */
export async function handleCoachChat(req: Request, deps: CoachDeps): Promise<Response> {
  try {
    return await chat(req, deps);
  } catch (e) {
    console.error('coach-chat failed', e);
    return fail('server_error', 500);
  }
}

async function chat(req: Request, deps: CoachDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return fail('method_not_allowed', 405);
  if (!deps.llm) return fail('not_configured', 503);

  const userId = await deps.getUserId(req);
  if (!userId) return fail('unauthorized', 401);

  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('invalid_request', 400);
  const { persona, message, conversationId, timezoneOffset = 0 } = parsed.data;
  const { store, llm } = deps;
  const now = deps.now?.() ?? new Date();
  const dayStart = localDayStart(now, timezoneOffset);

  // Limits: a burst limit for everyone, and the daily limit (app_config) on the free tier.
  const premium = await store.isPremium(userId);
  if (
    (await store.countUserMessagesSince(userId, new Date(now.getTime() - 60_000))) >=
    BURST_LIMIT_PER_MINUTE
  ) {
    return fail('rate_limited', 429);
  }
  let remaining: number | null = null;
  if (!premium) {
    const limit = await store.dailyLimit();
    const used = await store.countUserMessagesSince(userId, dayStart);
    if (used >= limit) return json({ error: 'limit_reached', limit }, 429);
    remaining = limit - used - 1;
  }

  let conversation = conversationId ?? null;
  if (conversation && (await store.conversationPersona(userId, conversation)) !== persona) {
    return fail('invalid_conversation', 400);
  }

  const context = buildCoachContext(
    await store.loadContext(userId, dayStart),
    localNow(now, timezoneOffset),
  );
  const system = coachSystemPrompt(persona, context);
  const history = conversation ? await store.history(conversation, HISTORY_MESSAGES) : [];
  const messages: LlmMessage[] = [...history, { role: 'user', content: message }];

  // Structured output, validated; one retry on invalid output (CLAUDE.md §11).
  let reply: z.infer<typeof replySchema> | null = null;
  for (let attempt = 0; attempt < 2 && !reply; attempt++) {
    try {
      const result = await llm.complete({ system, messages, maxTokens: 700 });
      await store.logUsage(userId, result.model, result.inputTokens, result.outputTokens);
      const candidate = replySchema.safeParse(extractJson(result.text));
      if (candidate.success) reply = candidate.data;
    } catch {
      // Network or provider error: retry once, then fail gracefully below.
    }
  }
  if (!reply) return fail('ai_failed', 502);

  const safety: SafetyFlag = combineFlags(reply.safety, screenMessage(message));
  const content = withSupportNote(reply.reply, safety);

  conversation ??= await store.createConversation(userId, persona, message.slice(0, 60));
  const saved = await store.saveExchange(userId, conversation, persona, message, content);
  if (safety !== 'none') {
    // Best effort: the user's reply matters more than the review queue.
    await store.recordSafetyEvent(userId, persona, safety).catch((e) => {
      console.error('safety event not recorded', e);
    });
  }
  return json({
    conversationId: conversation,
    messages: [saved.user, saved.assistant],
    remaining,
    safety,
    promptVersion: COACH_PROMPT_VERSION,
  });
}
