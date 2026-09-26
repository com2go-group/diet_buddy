import { FunctionsHttpError } from '@supabase/supabase-js';

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
  limit: number;
  usedToday: number;
}

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
      .select('value')
      .eq('key', 'coach_daily_message_limit_free')
      .limit(1),
    supabase
      .from('coach_messages')
      .select('id')
      .eq('user_id', userId)
      .eq('role', 'user')
      .gte('created_at', startOfToday().toISOString()),
  ]);
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
  const limit = Number(optional(config)?.[0]?.value ?? 5);
  return {
    conversationId,
    messages,
    premium: required(profile).is_premium,
    limit: Number.isFinite(limit) ? limit : 5,
    usedToday: (optional(used) ?? []).length,
  };
}

export type CoachErrorCode =
  'limit_reached' | 'rate_limited' | 'not_configured' | 'ai_failed' | 'failed';

export class CoachError extends Error {
  constructor(readonly code: CoachErrorCode) {
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
    body: { persona, message, conversationId, timezoneOffset: new Date().getTimezoneOffset() },
  });
  if (error) {
    let code: CoachErrorCode = 'failed';
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
      const known: CoachErrorCode[] = [
        'limit_reached',
        'rate_limited',
        'not_configured',
        'ai_failed',
      ];
      if (known.includes(body?.error as CoachErrorCode)) code = body!.error as CoachErrorCode;
    }
    throw new CoachError(code);
  }
  return data as SendResult;
}
