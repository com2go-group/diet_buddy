/** Local-time day helpers. Dates in the app are the user's local calendar days. */

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
    date.getHours(),
    date.getMinutes(),
  );
}

/** YYYY-MM-DD for the local calendar day (for date columns and grouping). */
export function dayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

export const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export type WeekdayKey = (typeof WEEKDAYS)[number];

export function weekdayKey(date: Date): WeekdayKey {
  return WEEKDAYS[date.getDay()]!;
}

/** "2026-09-26" → local midnight of that day; null when malformed. */
export function parseDayKey(key: string | undefined | null): Date | null {
  const match = key ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(key) : null;
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return dayKey(date) === key ? date : null;
}
