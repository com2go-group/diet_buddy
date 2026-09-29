import { KCAL_PER_KG_FAT, MAX_WEEKLY_LOSS_FRACTION } from './constants';

/**
 * Plan check-in every two weeks (adaptive TDEE). The formula-based TDEE is only an estimate; what
 * people actually eat and how their weight moves tells us their real energy use:
 *
 *   actual TDEE ≈ average intake − (weight change per day × 7,700 kcal/kg)
 *
 * From that we suggest a target that gives the planned weekly change. Every suggestion respects
 * the calorie floor (CLAUDE.md §9), is limited in size, and is only a suggestion: the user decides.
 */

export interface DayIntake {
  /** Local day key (YYYY-MM-DD). */
  day: string;
  kcal: number;
}
export interface WeightPoint {
  at: Date;
  kg: number;
}

export interface AdaptiveInput {
  days: DayIntake[];
  weights: WeightPoint[];
  currentTarget: number;
  /** Planned weekly change in kg (negative = loss), from the plan's forecast. */
  plannedWeeklyKg: number;
  /** max(sex floor, BMR); never suggest below it. */
  floor: number;
  /** Latest weight, for the 1 %-per-week loss cap. */
  weightKg: number;
}

export type AdaptiveResult =
  | { kind: 'not_enough_data'; loggedDays: number; weighInDays: number }
  | { kind: 'on_track'; estimatedTdee: number; weeklyKg: number }
  | {
      kind: 'suggest';
      estimatedTdee: number;
      /** Measured weekly change (negative = loss). */
      weeklyKg: number;
      suggested: number;
      reason: 'slower_than_planned' | 'faster_than_planned';
    };

/** Days with less than this share of the target logged are treated as incomplete and skipped. */
export const MIN_LOGGED_SHARE = 0.5;
export const MIN_LOGGED_DAYS = 10;
/** Weigh-ins must span at least this many days to read a trend. */
export const MIN_WEIGHT_SPAN_DAYS = 10;
/** Changes smaller than this aren't worth a new plan. */
export const MIN_CHANGE_KCAL = 100;
/** One check-in never moves the target by more than this. */
export const MAX_CHANGE_KCAL = 300;

const DAY_MS = 86_400_000;
const roundTo10 = (n: number) => Math.round(n / 10) * 10;

/** Least-squares slope of weight over time, in kg per day. */
export function weightSlopePerDay(points: WeightPoint[]): number | null {
  if (points.length < 2) return null;
  const t0 = points[0]!.at.getTime();
  const xs = points.map((p) => (p.at.getTime() - t0) / DAY_MS);
  const ys = points.map((p) => p.kg);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i]! - mx) * (ys[i]! - my);
    den += (xs[i]! - mx) ** 2;
  }
  return den === 0 ? null : num / den;
}

export function adaptivePlan(input: AdaptiveInput): AdaptiveResult {
  const logged = input.days.filter((d) => d.kcal >= input.currentTarget * MIN_LOGGED_SHARE);
  const sorted = [...input.weights].sort((a, b) => a.at.getTime() - b.at.getTime());
  const span =
    sorted.length > 1 ? (sorted.at(-1)!.at.getTime() - sorted[0]!.at.getTime()) / DAY_MS : 0;
  const slope = weightSlopePerDay(sorted);
  if (logged.length < MIN_LOGGED_DAYS || span < MIN_WEIGHT_SPAN_DAYS || slope === null) {
    return {
      kind: 'not_enough_data',
      loggedDays: logged.length,
      weighInDays: new Set(sorted.map((w) => w.at.toDateString())).size,
    };
  }

  const avgIntake = logged.reduce((t, d) => t + d.kcal, 0) / logged.length;
  const estimatedTdee = Math.round(avgIntake - slope * KCAL_PER_KG_FAT);
  const weeklyKg = Math.round(slope * 7 * 100) / 100;
  // Implausible numbers usually mean incomplete logging or a scale glitch: don't act on them.
  if (estimatedTdee < 1000 || estimatedTdee > 5000) {
    return { kind: 'not_enough_data', loggedDays: logged.length, weighInDays: sorted.length };
  }

  // Never plan to lose faster than 1 % of body weight a week.
  const planned = Math.max(input.plannedWeeklyKg, -input.weightKg * MAX_WEEKLY_LOSS_FRACTION);
  const ideal = estimatedTdee + (planned * KCAL_PER_KG_FAT) / 7;
  const step = Math.max(-MAX_CHANGE_KCAL, Math.min(MAX_CHANGE_KCAL, ideal - input.currentTarget));
  const suggested = Math.max(
    Math.ceil(input.floor / 10) * 10,
    roundTo10(input.currentTarget + step),
  );

  if (Math.abs(suggested - input.currentTarget) < MIN_CHANGE_KCAL) {
    return { kind: 'on_track', estimatedTdee, weeklyKg };
  }
  return {
    kind: 'suggest',
    estimatedTdee,
    weeklyKg,
    suggested,
    reason: suggested < input.currentTarget ? 'slower_than_planned' : 'faster_than_planned',
  };
}
