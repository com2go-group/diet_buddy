import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

import { allowanceFrom, type AiAllowance, type ClientDay } from './aiAllowance.ts';

/** Reads the user's AI allowance for their local day (service-role client). */
export function supabaseAllowance(db: SupabaseClient) {
  return async (userId: string, day: ClientDay): Promise<AiAllowance> => {
    const { data, error } = await db.rpc('ai_allowance', {
      p_user: userId,
      p_day_start: day.dayStart.toISOString(),
      p_local_date: day.localDate,
      p_web: day.web,
    });
    if (error) throw new Error(error.message);
    return allowanceFrom(data);
  };
}

/** Free users run on this model (FREE_AI_MODEL), Premium on the feature's own model. */
export const FREE_AI_MODEL_DEFAULT = 'claude-haiku-4-5';
