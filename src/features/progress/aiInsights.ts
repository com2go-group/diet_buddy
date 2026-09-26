import { FunctionsHttpError } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { dayKey } from '@/lib/dates';
import { supabase } from '@/lib/supabase';

import { useSessionStore } from '../auth/sessionStore';

/** Mirrors the generate-insights response; validated here. */
const responseSchema = z.object({
  day: z.string(),
  insights: z.array(z.object({ emoji: z.string(), title: z.string(), body: z.string() })),
  notEnoughData: z.boolean().optional(),
  daysLogged: z.number().optional(),
});
export type AiInsightsResult = z.infer<typeof responseSchema>;

export type AiInsightsErrorCode = 'not_configured' | 'premium_required' | 'failed';

export class AiInsightsError extends Error {
  constructor(readonly code: AiInsightsErrorCode) {
    super(code);
  }
}

export async function fetchAiInsights(now: Date): Promise<AiInsightsResult> {
  const { data, error } = await supabase.functions.invoke('generate-insights', {
    body: { tzOffsetMinutes: -now.getTimezoneOffset() },
  });
  if (error) {
    let code: AiInsightsErrorCode = 'failed';
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
      if (body?.error === 'not_configured' || body?.error === 'premium_required') code = body.error;
    }
    throw new AiInsightsError(code);
  }
  const parsed = responseSchema.safeParse(data);
  if (!parsed.success) throw new AiInsightsError('failed');
  return parsed.data;
}

/** Today's AI insights (Premium); generated once a day on the server, then cached there. */
export function useAiInsights(enabled: boolean) {
  const userId = useSessionStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['aiInsights', userId, dayKey(new Date())],
    enabled: enabled && Boolean(userId),
    queryFn: () => fetchAiInsights(new Date()),
    staleTime: Infinity,
    retry: false,
  });
}
