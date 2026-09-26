import type { MetricRow } from '../stats';

const DAY = 86_400_000;
/** A weigh-in counts for a photo when it is within this many days of it. */
export const WEIGHT_WINDOW_DAYS = 3;

/** The weight measured closest to `at`, if one is within three days. */
export function weightNear(metrics: MetricRow[], at: string): number | null {
  const time = new Date(at).getTime();
  let best: { diff: number; kg: number } | null = null;
  for (const m of metrics) {
    if (m.weight_kg === null) continue;
    const diff = Math.abs(new Date(m.measured_at).getTime() - time);
    if (diff <= WEIGHT_WINDOW_DAYS * DAY && (!best || diff < best.diff)) {
      best = { diff, kg: Number(m.weight_kg) };
    }
  }
  return best?.kg ?? null;
}

export interface Comparison {
  days: number;
  weightChangeKg: number | null;
}

export function compare(metrics: MetricRow[], before: string, after: string): Comparison {
  const days = Math.round(Math.abs(new Date(after).getTime() - new Date(before).getTime()) / DAY);
  const a = weightNear(metrics, before);
  const b = weightNear(metrics, after);
  return {
    days,
    weightChangeKg: a === null || b === null ? null : Math.round((b - a) * 10) / 10,
  };
}
