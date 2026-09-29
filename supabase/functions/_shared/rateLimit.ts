import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/** Counts one hit for `key` in a fixed window; false when over `max`. */
export type RateLimiter = (key: string, windowSeconds: number, max: number) => Promise<boolean>;

/** `rate_limit_hit` in the database (service role). Throws when the database can't answer. */
export function supabaseRateLimiter(db: SupabaseClient): RateLimiter {
  return async (key, windowSeconds, max) => {
    const { data, error } = await db.rpc('rate_limit_hit', {
      p_key: key,
      p_window_seconds: windowSeconds,
      p_max: max,
    });
    if (error) throw new Error(error.message);
    return data === true;
  };
}

/** A JSON object of whole numbers from app_config, falling back per field. */
export function limitsFrom<T extends Record<string, number>>(value: unknown, defaults: T): T {
  const v = (value ?? {}) as Record<string, unknown>;
  const out = { ...defaults };
  for (const k of Object.keys(defaults) as (keyof T & string)[]) {
    const n = v[k];
    if (typeof n === 'number' && Number.isInteger(n) && n >= 1) out[k] = n as T[typeof k];
  }
  return out;
}

export type Admission = 'ok' | 'limited' | 'unauthorized';

/**
 * Per-user caps for a function (per minute and per day, from app_config `rate_limits`, e.g.
 * `food_search_per_minute`). If the counters can't be reached the request is let through: these
 * limits protect shared quotas, and failing open keeps food logging working.
 */
export function userRateGuard(opts: {
  userId: (req: Request) => Promise<string | null>;
  limiter: RateLimiter;
  limits: () => Promise<{ perMinute: number; perDay: number }>;
  name: string;
}): (req: Request) => Promise<Admission> {
  return async (req) => {
    const user = await opts.userId(req);
    if (!user) return 'unauthorized';
    try {
      const { perMinute, perDay } = await opts.limits();
      const [minute, day] = await Promise.all([
        opts.limiter(`${opts.name}:${user}`, 60, perMinute),
        opts.limiter(`${opts.name}:${user}`, 86_400, perDay),
      ]);
      return minute && day ? 'ok' : 'limited';
    } catch (e) {
      console.error(`${opts.name}: rate limit check failed`, e);
      return 'ok';
    }
  };
}

/** The per-minute / per-day pair for `prefix` (food_search, food_barcode) from `rate_limits`. */
export function supabaseUserLimits(
  db: SupabaseClient,
  prefix: string,
  defaults: { perMinute: number; perDay: number },
): () => Promise<{ perMinute: number; perDay: number }> {
  return async () => {
    const { data } = await db
      .from('app_config')
      .select('value')
      .eq('key', 'rate_limits')
      .maybeSingle();
    const v = limitsFrom((data as { value: unknown } | null)?.value, {
      [`${prefix}_per_minute`]: defaults.perMinute,
      [`${prefix}_per_day`]: defaults.perDay,
    } as Record<string, number>);
    return { perMinute: v[`${prefix}_per_minute`]!, perDay: v[`${prefix}_per_day`]! };
  };
}
