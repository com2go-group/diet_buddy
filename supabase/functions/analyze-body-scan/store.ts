import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

import type { BodyScanContext, BodyScanStore } from './handler.ts';

const FUNCTION_NAME = 'analyze-body-scan';

function must<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

export function supabaseBodyScanStore(db: SupabaseClient): BodyScanStore {
  return {
    async context(userId): Promise<BodyScanContext> {
      const [profile, consent] = await Promise.all([
        db.from('profiles').select('is_premium, height_cm, gender').eq('user_id', userId).single(),
        db
          .from('consents')
          .select('granted')
          .eq('user_id', userId)
          .eq('consent_type', 'body_photos')
          .limit(1),
      ]);
      const p = must(profile) as {
        is_premium: boolean;
        height_cm: number | null;
        gender: string | null;
      };
      const c = (must(consent) as { granted: boolean }[] | null)?.[0];
      return {
        premium: Boolean(p.is_premium),
        photoConsent: Boolean(c?.granted),
        heightCm: p.height_cm === null ? null : Number(p.height_cm),
        sex: p.gender === 'male' || p.gender === 'female' ? p.gender : 'unspecified',
      };
    },

    async scansSince(userId, since) {
      const rows = must(
        await db
          .from('ai_usage')
          .select('id')
          .eq('user_id', userId)
          .eq('function_name', FUNCTION_NAME)
          .gte('created_at', since.toISOString())
          .limit(100),
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
