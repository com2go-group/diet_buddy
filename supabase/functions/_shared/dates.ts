/** Whole days from the server's UTC date to `date` (YYYY-MM-DD). */
export function dayOffset(date: string, now: Date): number {
  const today = Date.parse(now.toISOString().slice(0, 10));
  return Math.round((Date.parse(date) - today) / 86_400_000);
}
