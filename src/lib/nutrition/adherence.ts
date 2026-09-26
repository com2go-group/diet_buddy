export interface DayTotals {
  calories: number;
  proteinG: number;
  waterMl: number;
  checkedIn: boolean;
  /** Anything logged that day (food, water or a check-in). */
  logged: boolean;
}

export interface DayTargets {
  calories: number;
  proteinG: number;
  waterMl: number;
}

/** Share of each component in the daily score. */
export const ADHERENCE_WEIGHTS = {
  calories: 0.4,
  protein: 0.25,
  water: 0.25,
  checkIn: 0.1,
} as const;

/**
 * Calories count up to the target; beyond 110 % of target the credit falls off (to 0 at 160 %).
 * Eating less than the target never scores higher than hitting it, so the score can't reward
 * undereating (CLAUDE.md §9).
 */
export function calorieCredit(actual: number, target: number): number {
  if (!(target > 0) || actual <= 0) return 0;
  const ratio = actual / target;
  if (ratio <= 1) return ratio;
  if (ratio <= 1.1) return 1;
  return Math.max(0, 1 - (ratio - 1.1) * 2);
}

const progress = (actual: number, target: number) =>
  target > 0 ? Math.min(1, Math.max(0, actual / target)) : 0;

/**
 * Today's Score / daily adherence (CLAUDE.md §7.5), 0–100. During the day it grows as the user
 * logs; for past days it is the whole day's adherence. Null when nothing was logged.
 */
export function adherenceScore(day: DayTotals, targets: DayTargets): number | null {
  if (!day.logged) return null;
  const w = ADHERENCE_WEIGHTS;
  const score =
    w.calories * calorieCredit(day.calories, targets.calories) +
    w.protein * progress(day.proteinG, targets.proteinG) +
    w.water * progress(day.waterMl, targets.waterMl) +
    w.checkIn * (day.checkedIn ? 1 : 0);
  return Math.round(score * 100);
}
