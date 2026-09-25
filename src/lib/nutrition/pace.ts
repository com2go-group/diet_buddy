import {
  FAST_PACE_MAX_WEEKLY_KG,
  KCAL_PER_KG_FAT,
  MAX_WEEKLY_LOSS_FRACTION,
  PACE_WEEKLY_KG,
} from './constants';
import type { Pace } from './types';
import { assertPositive } from './validation';

/** Daily energy deficit for a weekly loss rate: weeklyKg × 7700 / 7 (0.5 kg/week ≈ 550 kcal/day). */
export function dailyDeficitForWeeklyKg(weeklyKg: number): number {
  return (weeklyKg * KCAL_PER_KG_FAT) / 7;
}

/** Inverse of dailyDeficitForWeeklyKg. */
export function weeklyKgForDailyDeficit(dailyDeficitKcal: number): number {
  return (dailyDeficitKcal * 7) / KCAL_PER_KG_FAT;
}

/** Largest safe weekly loss: 1 % of current body weight (CLAUDE.md §9). */
export function maxWeeklyLossKg(weightKg: number): number {
  assertPositive('weightKg', weightKg);
  return weightKg * MAX_WEEKLY_LOSS_FRACTION;
}

/**
 * Weekly loss the user asked for, before safety caps. 'fast' scales with body weight
 * inside its advertised 0.75–1.0 kg/week band (1 % of body weight, clamped to the band).
 */
export function requestedWeeklyKg(pace: Pace, weightKg: number): number {
  if (pace !== 'fast') return PACE_WEEKLY_KG[pace];
  return Math.min(
    FAST_PACE_MAX_WEEKLY_KG,
    Math.max(PACE_WEEKLY_KG.fast, maxWeeklyLossKg(weightKg)),
  );
}

/** Weeks to lose `kgToLose` at `weeklyKg`, rounded up. Null when there is no loss to plan. */
export function weeksToGoal(kgToLose: number, weeklyKg: number): number | null {
  if (!(kgToLose > 0) || !(weeklyKg > 0)) return null;
  return Math.ceil(kgToLose / weeklyKg - 1e-9);
}

/** Weekly loss needed to reach a goal in `weeks`. Used to check a chosen goal date against the pace. */
export function requiredWeeklyKg(kgToLose: number, weeks: number): number {
  assertPositive('weeks', weeks);
  return Math.max(0, kgToLose) / weeks;
}

export function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + weeks * 7);
  return result;
}
