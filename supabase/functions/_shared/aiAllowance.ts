import { json } from './http.ts';

/**
 * Free-tier AI funded by ads (decision log 2026-09-29). Free users get per-feature daily limits
 * that rewarded videos raise, plus a daily AI budget in USD (base + a top-up per video watched
 * today, capped) as a backstop against runaway token use; Premium has fair-use limits only. The
 * numbers live in app_config and come from the `ai_allowance` database function.
 */

export interface AiLimits {
  coachFree: number;
  coachPremium: number;
  foodPhotoFree: number;
  alternativesFree: number;
  boostCoach: number;
  boostFoodPhoto: number;
  boostAlternatives: number;
}

export interface AiAllowance {
  premium: boolean;
  spentUsd: number;
  budgetUsd: number;
  /** Rewarded videos watched today that count (capped at boostsMax). */
  boosts: number;
  boostsMax: number;
  limits: AiLimits;
}

/** The caller's local day and platform, from the app's request headers. */
export interface ClientDay {
  /** Start of the user's local day, as an instant. */
  dayStart: Date;
  /** The user's local date, "YYYY-MM-DD" (the prefix of today's rewarded-video targets). */
  localDate: string;
  /** The web build shows no ads, so it gets a smaller budget and no video offers. */
  web: boolean;
}

export const TZ_HEADER = 'x-client-tz-offset';
export const PLATFORM_HEADER = 'x-client-platform';

/**
 * `x-client-tz-offset` is Date.getTimezoneOffset() on the device (minutes, positive west of
 * UTC); `x-client-platform` is Platform.OS. Both are hints: a wrong offset only moves the day
 * boundary, and claiming not to be on the web only gives the native base budget.
 */
export function clientDay(req: Request, now: Date, fallbackOffset = 0): ClientDay {
  const raw = Number(req.headers.get(TZ_HEADER));
  const offset =
    req.headers.get(TZ_HEADER) !== null && Number.isInteger(raw) && Math.abs(raw) <= 840
      ? raw
      : fallbackOffset;
  const local = new Date(now.getTime() - offset * 60_000);
  const localDate = local.toISOString().slice(0, 10);
  const dayStart = new Date(Date.parse(`${localDate}T00:00:00Z`) + offset * 60_000);
  return { dayStart, localDate, web: req.headers.get(PLATFORM_HEADER) === 'web' };
}

const num = (v: unknown, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** Parses the `ai_allowance` database function's answer (defaults match the migration). */
export function allowanceFrom(row: unknown): AiAllowance {
  const r = (row ?? {}) as Record<string, unknown>;
  const l = (r.limits ?? {}) as Record<string, unknown>;
  return {
    premium: r.premium === true,
    spentUsd: num(r.spent_usd, 0),
    budgetUsd: num(r.budget_usd, 0.03),
    boosts: num(r.boosts, 0),
    boostsMax: num(r.boosts_max, 3),
    limits: {
      coachFree: num(l.coach_free, 3),
      coachPremium: num(l.coach_premium, 60),
      foodPhotoFree: num(l.food_photo_free, 1),
      alternativesFree: num(l.alternatives_free, 1),
      boostCoach: num(l.boost_coach, 1),
      boostFoodPhoto: num(l.boost_food_photo, 1),
      boostAlternatives: num(l.boost_alternatives, 1),
    },
  };
}

/** Free users: today's AI spend has reached the budget. */
export const overBudget = (a: AiAllowance) => !a.premium && a.spentUsd >= a.budgetUsd;

/**
 * The rewarded video the app may offer next ("YYYY-MM-DD:n", recorded by admob-ssv), or null
 * when none is left today, on the web build (no ads) and for Premium.
 */
export function nextBoost(a: AiAllowance, day: ClientDay): string | null {
  if (a.premium || day.web || a.boosts >= a.boostsMax) return null;
  return `${day.localDate}:${a.boosts + 1}`;
}

/**
 * 429 for a free user out of AI for today: `boost` is the video that adds `adds` more (of the
 * feature asked for), or null when only Premium helps.
 */
export function outOfAi(
  code: 'limit_reached' | 'alternative_limit' | 'ai_budget',
  a: AiAllowance,
  day: ClientDay,
  extra: { limit?: number; adds?: number } = {},
): Response {
  const target = nextBoost(a, day);
  return json(
    { error: code, ...extra, boost: target ? { target, adds: extra.adds ?? null } : null },
    429,
  );
}
