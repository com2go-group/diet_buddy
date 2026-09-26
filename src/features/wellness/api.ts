import { FunctionsHttpError } from '@supabase/supabase-js';
import { z } from 'zod';

import { optional, supabase } from '@/lib/supabase';

export const WELLNESS_THEMES = [
  'sleep',
  'stress',
  'energy',
  'mood',
  'motivation',
  'habits',
  'nutrition',
  'movement',
] as const;
export type WellnessTheme = (typeof WELLNESS_THEMES)[number];

const insightSchema = z.object({
  emoji: z.string(),
  theme: z.enum(WELLNESS_THEMES),
  title: z.string(),
  body: z.string(),
});
export type WellnessInsight = z.infer<typeof insightSchema>;

/** Mirrors the generate-wellness-insights response; validated here. */
const responseSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('ok'),
    periodStart: z.string(),
    periodEnd: z.string(),
    insights: z.array(insightSchema),
    messagesAnalysed: z.number(),
    createdAt: z.string(),
  }),
  z.object({
    status: z.literal('support'),
    flag: z.enum(['crisis', 'disordered_eating']),
    note: z.string(),
  }),
  z.object({ status: z.literal('not_enough'), messageCount: z.number(), needed: z.number() }),
]);
export type WellnessResult = z.infer<typeof responseSchema>;

export type WellnessErrorCode =
  'premium_required' | 'consent_required' | 'not_configured' | 'rate_limited' | 'failed';
const KNOWN: WellnessErrorCode[] = [
  'premium_required',
  'consent_required',
  'not_configured',
  'rate_limited',
];

export class WellnessError extends Error {
  constructor(readonly code: WellnessErrorCode) {
    super(code);
  }
}

export async function fetchWellness(now: Date): Promise<WellnessResult> {
  const { data, error } = await supabase.functions.invoke('generate-wellness-insights', {
    body: { tzOffsetMinutes: -now.getTimezoneOffset() },
  });
  if (error) {
    let code: WellnessErrorCode = 'failed';
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
      const found = KNOWN.find((k) => k === body?.error);
      if (found) code = found;
    }
    throw new WellnessError(code);
  }
  const parsed = responseSchema.safeParse(data);
  if (!parsed.success) throw new WellnessError('failed');
  return parsed.data;
}

/** Deletes every stored wellness insight of the user (the consent itself is unchanged). */
export async function deleteWellness(userId: string): Promise<void> {
  optional(await supabase.from('wellness_insights').delete().eq('user_id', userId));
}
