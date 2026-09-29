import { FunctionsHttpError } from '@supabase/supabase-js';

import { getLanguage } from '@/i18n';
import { aiHeaders, boostFrom, type AiBoost } from '@/lib/ai/headers';
import { dayKey } from '@/lib/dates';
import { optional, required, supabase, type Enums } from '@/lib/supabase';

export type Persona = Enums<'coach_persona'>;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface CoachThread {
  conversationId: string | null;
  messages: ChatMessage[];
  premium: boolean;
  /** Today's free limit, including what today's rewarded videos added. */
  limit: number;
  usedToday: number;
  /** The next rewarded video for more messages today, or null when none is left. */
  boost: AiBoost | null;
}

const LIMIT_KEYS = [
  'coach_daily_message_limit_free',
  'ai_boost_coach_messages',
  'ai_boosts_daily_max',
] as const;

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/** The persona's latest conversation plus today's usage, for the limit banner. */
export async function loadThread(userId: string, persona: Persona): Promise<CoachThread> {
  const [conversations, profile, config, used] = await Promise.all([
    supabase
      .from('coach_conversations')
      .select('id')
      .eq('user_id', userId)
      .eq('persona', persona)
      .order('updated_at', { ascending: false })
      .limit(1),
    supabase.from('profiles').select('is_premium').eq('user_id', userId).single(),
    supabase
      .from('app_config')
      .select('key, value')
      .in('key', [...LIMIT_KEYS]),
    supabase
      .from('coach_messages')
      .select('id')
      .eq('user_id', userId)
      .eq('role', 'user')
      .gte('created_at', startOfToday().toISOString()),
  ]);
  // Rewarded videos watched today (AI boosts and meal reveals) raise the free limit.
  const today = dayKey(new Date());
  const videos = await supabase
    .from('ad_unlocks')
    .select('id')
    .eq('user_id', userId)
    .like('target_id', `${today}:%`);
  const conversationId = optional(conversations)?.[0]?.id ?? null;
  let messages: ChatMessage[] = [];
  if (conversationId) {
    const rows = await supabase
      .from('coach_messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at')
      .limit(200);
    messages = optional(rows) ?? [];
  }
  const values = new Map((optional(config) ?? []).map((row) => [row.key, Number(row.value)]));
  const setting = (key: (typeof LIMIT_KEYS)[number], fallback: number) => {
    const v = values.get(key);
    return v !== undefined && Number.isFinite(v) ? v : fallback;
  };
  const perVideo = setting('ai_boost_coach_messages', 1);
  const maxVideos = setting('ai_boosts_daily_max', 3);
  const watched = Math.min(maxVideos, (optional(videos) ?? []).length);
  return {
    conversationId,
    messages,
    premium: required(profile).is_premium,
    limit: setting('coach_daily_message_limit_free', 3) + watched * perVideo,
    usedToday: (optional(used) ?? []).length,
    boost: watched < maxVideos ? { target: `${today}:${watched + 1}`, adds: perVideo } : null,
  };
}

export type CoachErrorCode =
  | 'limit_reached'
  | 'ai_budget'
  | 'fair_use_limit'
  | 'rate_limited'
  | 'not_configured'
  | 'ai_failed'
  | 'failed';

export class CoachError extends Error {
  constructor(
    readonly code: CoachErrorCode,
    /** A rewarded video that adds more AI use today, when the server offers one. */
    readonly boost: AiBoost | null = null,
  ) {
    super(code);
  }
}

export interface SendResult {
  conversationId: string;
  messages: [ChatMessage, ChatMessage];
  remaining: number | null;
}

export async function sendMessage(
  persona: Persona,
  message: string,
  conversationId: string | null,
): Promise<SendResult> {
  const { data, error } = await supabase.functions.invoke('coach-chat', {
    headers: aiHeaders(),
    body: {
      persona,
      message,
      conversationId,
      timezoneOffset: new Date().getTimezoneOffset(),
      language: getLanguage(),
    },
  });
  if (error) {
    let code: CoachErrorCode = 'failed';
    let boost: AiBoost | null = null;
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
      const known: CoachErrorCode[] = [
        'limit_reached',
        'ai_budget',
        'fair_use_limit',
        'rate_limited',
        'not_configured',
        'ai_failed',
      ];
      if (known.includes(body?.error as CoachErrorCode)) code = body!.error as CoachErrorCode;
      boost = boostFrom(body);
    }
    throw new CoachError(code, boost);
  }
  return data as SendResult;
}
