import { addDays, dayKey, startOfDay, weekdayKey } from '@/lib/dates';
import { addWeeks } from '@/lib/nutrition';

export interface MetricRow {
  measured_at: string;
  weight_kg: number | null;
  bmi: number | null;
  waist_cm: number | null;
  body_fat_pct: number | null;
}
export interface FoodRow {
  logged_at: string;
  calories: number;
  protein_g: number;
}
export interface WaterRow {
  logged_at: string;
  ml: number;
}
export interface CheckinRow {
  date: string;
  energy: number;
  sleep_hours: number | null;
}
export interface WeightPoint {
  date: Date;
  kg: number;
}

const DAY_MS = 86_400_000;
const round1 = (n: number) => Math.round(n * 10) / 10;

/** One weight per day (the last reading of that day), oldest first, within `days` of now. */
export function weightSeries(metrics: MetricRow[], now: Date, days = 90): WeightPoint[] {
  const since = addDays(startOfDay(now), -days).getTime();
  const byDay = new Map<string, WeightPoint>();
  for (const m of [...metrics].sort((a, b) => a.measured_at.localeCompare(b.measured_at))) {
    const date = new Date(m.measured_at);
    if (m.weight_kg === null || date.getTime() < since) continue;
    byDay.set(dayKey(date), { date, kg: Number(m.weight_kg) });
  }
  return [...byDay.values()];
}

/** Least-squares slope in kg/week over the last 28 days; null without 3 points across 7+ days. */
export function trendPerWeek(series: WeightPoint[], now: Date): number | null {
  const recent = series.filter((p) => now.getTime() - p.date.getTime() <= 28 * DAY_MS);
  if (recent.length < 3) return null;
  const xs = recent.map((p) => p.date.getTime() / DAY_MS);
  if (Math.max(...xs) - Math.min(...xs) < 7) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = recent.reduce((a, p) => a + p.kg, 0) / recent.length;
  let num = 0;
  let den = 0;
  recent.forEach((p, i) => {
    num += (xs[i]! - mx) * (p.kg - my);
    den += (xs[i]! - mx) ** 2;
  });
  return den === 0 ? null : Math.round((num / den) * 7 * 100) / 100;
}

/** Calories per local day for the last `days` days (oldest first); days without logs are null. */
export function dailyCalories(food: FoodRow[], now: Date, days = 7) {
  const totals = new Map<string, number>();
  for (const f of food) {
    const key = dayKey(new Date(f.logged_at));
    totals.set(key, (totals.get(key) ?? 0) + Number(f.calories));
  }
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(startOfDay(now), i - days + 1);
    const kcal = totals.get(dayKey(date));
    return {
      key: dayKey(date),
      weekday: weekdayKey(date),
      kcal: kcal === undefined ? null : Math.round(kcal),
    };
  });
}

export function averageCalories(days: { kcal: number | null }[]): number | null {
  const logged = days.filter((d) => d.kcal !== null) as { kcal: number }[];
  return logged.length ? Math.round(logged.reduce((a, d) => a + d.kcal, 0) / logged.length) : null;
}

/**
 * When the goal weight would be reached from the latest weight at the plan's weekly rate.
 * Only for weight loss; null once the goal is reached or without a rate.
 */
export function projection(latestKg: number, goalKg: number, weeklyChangeKg: number, now: Date) {
  const toLose = latestKg - goalKg;
  if (toLose <= 0 || weeklyChangeKg >= 0) return null;
  const weeks = Math.ceil(toLose / -weeklyChangeKg);
  return { weeks, date: addWeeks(now, weeks), toLoseKg: round1(toLose) };
}

export type MetricKey = 'weight_kg' | 'bmi' | 'waist_cm' | 'body_fat_pct';

/** Latest and first recorded value of each body metric, and the change between them. */
export function metricChanges(metrics: MetricRow[]) {
  const sorted = [...metrics].sort((a, b) => a.measured_at.localeCompare(b.measured_at));
  const keys: MetricKey[] = ['weight_kg', 'bmi', 'waist_cm', 'body_fat_pct'];
  return Object.fromEntries(
    keys.map((key) => {
      const values = sorted
        .map((m) => m[key])
        .filter((v): v is number => v !== null)
        .map(Number);
      const first = values[0];
      const current = values[values.length - 1];
      return [
        key,
        current === undefined
          ? null
          : { current, change: values.length > 1 ? round1(current - first!) : null },
      ];
    }),
  ) as Record<MetricKey, { current: number; change: number | null } | null>;
}

export type Insight =
  | { kind: 'proteinGap'; avg: number; target: number; pct: number }
  | { kind: 'proteinOnTrack'; avg: number; target: number }
  | { kind: 'calorieTiming'; pct: number }
  | { kind: 'hydrationGap'; avgMl: number; targetMl: number }
  | { kind: 'hydrationOnTrack'; avgMl: number }
  | { kind: 'weekendCalories'; diff: number }
  | { kind: 'sleepEnergy'; rested: number; short: number };

const MIN_DAYS = 5;

/**
 * Rule-based insights from the last 14 days of logs (CLAUDE.md §7.8). Each needs at least
 * 5 days of data; nothing is guessed. The AI-written version arrives in Phase 3.
 */
export function insights(
  data: { food: FoodRow[]; water: WaterRow[]; checkins: CheckinRow[] },
  targets: { proteinG: number; waterMl: number } | null,
  now: Date,
): Insight[] {
  const since = addDays(startOfDay(now), -13).getTime();
  const food = data.food.filter((f) => new Date(f.logged_at).getTime() >= since);
  const out: Insight[] = [];

  const days = new Map<
    string,
    { kcal: number; protein: number; morning: number; weekend: boolean }
  >();
  for (const f of food) {
    const d = new Date(f.logged_at);
    const key = dayKey(d);
    const day = days.get(key) ?? {
      kcal: 0,
      protein: 0,
      morning: 0,
      weekend: [0, 6].includes(d.getDay()),
    };
    day.kcal += Number(f.calories);
    day.protein += Number(f.protein_g);
    if (d.getHours() < 12) day.morning += Number(f.calories);
    days.set(key, day);
  }
  const list = [...days.values()];

  if (targets && list.length >= MIN_DAYS) {
    const avg = Math.round(list.reduce((a, d) => a + d.protein, 0) / list.length);
    const pct = Math.round((avg / targets.proteinG) * 100);
    out.push(
      pct < 90
        ? { kind: 'proteinGap', avg, target: targets.proteinG, pct: 100 - pct }
        : { kind: 'proteinOnTrack', avg, target: targets.proteinG },
    );
  }
  const totalKcal = list.reduce((a, d) => a + d.kcal, 0);
  if (list.length >= MIN_DAYS && totalKcal > 0) {
    out.push({
      kind: 'calorieTiming',
      pct: Math.round((list.reduce((a, d) => a + d.morning, 0) / totalKcal) * 100),
    });
  }

  const waterDays = new Map<string, number>();
  for (const w of data.water.filter((x) => new Date(x.logged_at).getTime() >= since)) {
    const key = dayKey(new Date(w.logged_at));
    waterDays.set(key, (waterDays.get(key) ?? 0) + Number(w.ml));
  }
  if (targets && waterDays.size >= MIN_DAYS) {
    const avgMl = Math.round([...waterDays.values()].reduce((a, b) => a + b, 0) / waterDays.size);
    out.push(
      avgMl < targets.waterMl * 0.9
        ? { kind: 'hydrationGap', avgMl, targetMl: targets.waterMl }
        : { kind: 'hydrationOnTrack', avgMl },
    );
  }

  const weekend = list.filter((d) => d.weekend);
  const weekday = list.filter((d) => !d.weekend);
  if (weekend.length >= 2 && weekday.length >= 3) {
    const avg = (xs: typeof list) => xs.reduce((a, d) => a + d.kcal, 0) / xs.length;
    const diff = Math.round((avg(weekend) - avg(weekday)) / 10) * 10;
    if (Math.abs(diff) >= 150) out.push({ kind: 'weekendCalories', diff });
  }

  const slept = data.checkins.filter((c) => c.sleep_hours !== null);
  const rested = slept.filter((c) => Number(c.sleep_hours) >= 7);
  const short = slept.filter((c) => Number(c.sleep_hours) < 7);
  if (slept.length >= MIN_DAYS && rested.length >= 2 && short.length >= 2) {
    const avg = (xs: CheckinRow[]) => round1(xs.reduce((a, c) => a + c.energy, 0) / xs.length);
    out.push({ kind: 'sleepEnergy', rested: avg(rested), short: avg(short) });
  }
  return out;
}
