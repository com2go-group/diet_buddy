import type { WeightSample } from '@/lib/health';

export interface StoredWeight {
  measured_at: string;
  weight_kg: number | null;
}

const WINDOW_MS = 2 * 60_000;

/**
 * Health-store weights not yet in body_metrics. A sample counts as already stored when a row is
 * within 2 minutes and 0.05 kg of it, whatever its source; that also skips the weights DietBuddy
 * itself wrote to the health store (check-ins), so they don't come back as duplicates.
 */
export function newWeights(samples: WeightSample[], stored: StoredWeight[]): WeightSample[] {
  const known = stored
    .filter((s) => s.weight_kg !== null)
    .map((s) => ({ at: new Date(s.measured_at).getTime(), kg: Number(s.weight_kg) }));
  const fresh: WeightSample[] = [];
  for (const sample of samples) {
    if (sample.kg < 30 || sample.kg > 350) continue; // same bounds as the database
    const t = sample.at.getTime();
    const dup = [...known, ...fresh.map((f) => ({ at: f.at.getTime(), kg: f.kg }))].some(
      (k) => Math.abs(k.at - t) <= WINDOW_MS && Math.abs(k.kg - sample.kg) <= 0.05,
    );
    if (!dup) fresh.push({ kg: Math.round(sample.kg * 100) / 100, at: sample.at });
  }
  return fresh;
}

export const SYNC_INTERVAL_MS = 30 * 60_000;
export const FIRST_SYNC_DAYS = 30;
