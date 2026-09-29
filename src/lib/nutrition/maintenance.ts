/**
 * After the goal (CLAUDE.md §7.2 follow-up, decision log 2026-09-30): once the smoothed trend
 * weight reaches the goal, the user moves to a sustainable maintenance plan. Calories rise to
 * maintenance in steps (at most MAINTENANCE_STEP_KCAL, two weeks apart) so weight stays steady
 * while the body and appetite adjust, instead of jumping straight back up.
 */

/** Trend within this much above the goal counts as reached (scales and water vary). */
export const GOAL_REACHED_MARGIN_KG = 0.3;
export const MAINTENANCE_STEP_KCAL = 250;
export const MAINTENANCE_STEP_DAYS = 14;
/** In maintenance, a trend this far above the kept weight gets a gentle offer to refocus. */
export const REGAIN_BAND_KG = 2;

export function goalReached(trendKg: number | null, goalKg: number | null): boolean {
  return trendKg !== null && goalKg !== null && trendKg <= goalKg + GOAL_REACHED_MARGIN_KG;
}

/**
 * The next calorie target on the way to maintenance: current + up to one step, never above
 * maintenance; null once there (within 20 kcal) or when the current target is already higher.
 */
export function nextMaintenanceTarget(currentKcal: number, maintenanceKcal: number): number | null {
  if (currentKcal >= maintenanceKcal - 20) return null;
  const next = Math.min(maintenanceKcal, currentKcal + MAINTENANCE_STEP_KCAL);
  return Math.round(next / 10) * 10;
}

/** Whether the next step is due: two weeks after the last maintenance plan. */
export function maintenanceStepDue(lastStepAt: Date, now: Date): boolean {
  return now.getTime() - lastStepAt.getTime() >= MAINTENANCE_STEP_DAYS * 86_400_000;
}

export function regainedAboveBand(trendKg: number | null, keptKg: number | null): boolean {
  return trendKg !== null && keptKg !== null && trendKg > keptKg + REGAIN_BAND_KG;
}
