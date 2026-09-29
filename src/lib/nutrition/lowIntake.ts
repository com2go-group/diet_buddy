/**
 * Gentle care check (CLAUDE.md §9): several recent days logged far below the plan can be a sign
 * of restriction. Only fairly complete days count (two or more meals logged), so a day where
 * someone logged just breakfast isn't mistaken for not eating. Today is never counted.
 */

export const LOW_INTAKE_SHARE = 0.6;
export const LOW_INTAKE_MIN_MEALS = 2;
export const LOW_INTAKE_DAYS = 3;
export const LOW_INTAKE_WINDOW = 7;

export interface IntakeLog {
  logged_at: string;
  meal_slot: string;
  calories: number;
}

const localKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** How many of the last 7 days (before today) were logged far below the calorie target. */
export function lowIntakeDays(logs: IntakeLog[], targetKcal: number, now: Date): number {
  if (!(targetKcal > 0)) return 0;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const since = new Date(today);
  since.setDate(since.getDate() - LOW_INTAKE_WINDOW);
  const days = new Map<string, { kcal: number; slots: Set<string> }>();
  for (const log of logs) {
    const at = new Date(log.logged_at);
    if (at < since || at >= today) continue;
    const key = localKey(at);
    const day = days.get(key) ?? { kcal: 0, slots: new Set<string>() };
    day.kcal += Number(log.calories) || 0;
    day.slots.add(log.meal_slot);
    days.set(key, day);
  }
  const limit = targetKcal * LOW_INTAKE_SHARE;
  return [...days.values()].filter((d) => d.slots.size >= LOW_INTAKE_MIN_MEALS && d.kcal < limit)
    .length;
}

/** Show the care card: enough low days, and not closed in the last 7 days. */
export function careCheckDue(lowDays: number, dismissedAt: string | undefined, now: Date): boolean {
  if (lowDays < LOW_INTAKE_DAYS) return false;
  if (!dismissedAt) return true;
  return now.getTime() - new Date(dismissedAt).getTime() >= 7 * 86_400_000;
}
