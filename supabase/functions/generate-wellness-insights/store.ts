import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

import { WELLNESS_PROMPT_VERSION } from '../_prompts/wellness.v1.ts';
import type { UserMessage, WellnessInsight, WellnessSet, WellnessStore } from './handler.ts';

const FUNCTION_NAME = 'generate-wellness-insights';

function must<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

interface Row {
  period_start: string;
  period_end: string;
  insights: WellnessInsight[];
  messages_analysed: number;
  created_at: string;
}

const toSet = (r: Row): WellnessSet => ({
  periodStart: r.period_start,
  periodEnd: r.period_end,
  insights: r.insights,
  messagesAnalysed: r.messages_analysed,
  createdAt: r.created_at,
});
const COLUMNS = 'period_start, period_end, insights, messages_analysed, created_at';

export function supabaseWellnessStore(db: SupabaseClient): WellnessStore {
  return {
    async premium(userId) {
      const row = must(
        await db.from('profiles').select('is_premium').eq('user_id', userId).single(),
      ) as { is_premium: boolean };
      return Boolean(row.is_premium);
    },

    async consented(userId) {
      const rows = must(
        await db
          .from('consents')
          .select('granted')
          .eq('user_id', userId)
          .eq('consent_type', 'coach_insights')
          .limit(1),
      ) as { granted: boolean }[] | null;
      return rows?.[0]?.granted === true;
    },

    async latest(userId) {
      const rows = must(
        await db
          .from('wellness_insights')
          .select(COLUMNS)
          .eq('user_id', userId)
          .order('period_end', { ascending: false })
          .limit(1),
      ) as Row[] | null;
      return rows?.[0] ? toSet(rows[0]) : null;
    },

    async messages(userId, since) {
      return (
        (must(
          await db
            .from('coach_messages')
            .select('persona, created_at, content')
            .eq('user_id', userId)
            .eq('role', 'user')
            .gte('created_at', since.toISOString())
            .order('created_at', { ascending: false })
            .limit(500),
        ) as UserMessage[] | null) ?? []
      );
    },

    async save(userId, set, model) {
      const row = must(
        await db
          .from('wellness_insights')
          .upsert(
            {
              user_id: userId,
              period_start: set.periodStart,
              period_end: set.periodEnd,
              insights: set.insights,
              messages_analysed: set.messagesAnalysed,
              model,
              prompt_version: WELLNESS_PROMPT_VERSION,
            },
            { onConflict: 'user_id,period_end' },
          )
          .select(COLUMNS)
          .single(),
      ) as Row;
      return toSet(row);
    },

    async callsSince(userId, since) {
      const rows = must(
        await db
          .from('ai_usage')
          .select('id')
          .eq('user_id', userId)
          .eq('function_name', FUNCTION_NAME)
          .gte('created_at', since.toISOString())
          .limit(1000),
      ) as unknown[] | null;
      return rows?.length ?? 0;
    },

    async logUsage(userId, model, inputTokens, outputTokens) {
      must(
        await db.from('ai_usage').insert({
          user_id: userId,
          function_name: FUNCTION_NAME,
          model,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
        }),
      );
    },
  };
}
