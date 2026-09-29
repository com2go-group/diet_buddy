import { Platform } from 'react-native';

/**
 * Sent with every AI request: the device's time zone (so "today" and today's rewarded videos
 * follow the user's clock) and the platform (the web build has no ads, so a smaller free AI
 * allowance and no video offers). See supabase/functions/_shared/aiAllowance.ts.
 */
export function aiHeaders(): Record<string, string> {
  return {
    'x-client-tz-offset': String(new Date().getTimezoneOffset()),
    'x-client-platform': Platform.OS,
  };
}

/** A rewarded video the server offers for more AI today, or null when only Premium helps. */
export interface AiBoost {
  target: string;
  /** How many more of the feature it adds, or null for the general AI budget. */
  adds: number | null;
}

/** The `boost` of a 429 answer from an AI function. */
export function boostFrom(body: unknown): AiBoost | null {
  const b = (body as { boost?: unknown } | null)?.boost as
    { target?: unknown; adds?: unknown } | null | undefined;
  if (!b || typeof b.target !== 'string' || !/^\d{4}-\d{2}-\d{2}:\d{1,2}$/.test(b.target)) {
    return null;
  }
  return { target: b.target, adds: typeof b.adds === 'number' ? b.adds : null };
}
