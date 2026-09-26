import { addDays, dayKey, startOfDay } from '@/lib/dates';
import { levelFor } from '@/lib/gamification/levels';
import { adherenceScore, type DayTargets } from '@/lib/nutrition';

export interface StoryInput {
  now: Date;
  targets: DayTargets | null;
  food: { logged_at: string; calories: number; protein_g: number }[];
  water: { logged_at: string; ml: number }[];
  checkins: { date: string }[];
  /** Every weigh-in, any order. */
  weights: { measured_at: string; weight_kg: number | null }[];
  badges: { title: string; emoji: string | null; unlockedAt: string }[];
  streakDays: number;
  xp: number;
}

export interface WeekStats {
  start: Date;
  end: Date;
  /** Days with food logged (0–7). */
  daysLogged: number;
  /** Days within 90–110 % of the calorie target. */
  daysOnTarget: number;
  /** Days the water goal was reached. */
  waterDays: number;
  checkins: number;
  /** Average daily score over days with anything logged; null when none. */
  avgScore: number | null;
  /** Change over the week, from the last weigh-in before it (or its first); null without two. */
  weightChangeKg: number | null;
  streakDays: number;
  level: number;
  /** Achievements unlocked this week, newest first. */
  badges: { title: string; emoji: string }[];
}

export const STORY_DAYS = 7;
const ON_TARGET = [0.9, 1.1] as const;

/** The last 7 local days, today included. */
export function weekStats(input: StoryInput): WeekStats {
  const end = startOfDay(input.now);
  const start = addDays(end, -(STORY_DAYS - 1));
  const keys = Array.from({ length: STORY_DAYS }, (_, i) => dayKey(addDays(start, i)));
  const inWeek = new Set(keys);
  const day = (iso: string) => dayKey(new Date(iso));

  const totals = new Map(
    keys.map((k) => [k, { calories: 0, proteinG: 0, waterMl: 0, food: false, checkedIn: false }]),
  );
  for (const f of input.food) {
    const d = totals.get(day(f.logged_at));
    if (!d) continue;
    d.calories += Number(f.calories);
    d.proteinG += Number(f.protein_g);
    d.food = true;
  }
  for (const w of input.water) {
    const d = totals.get(day(w.logged_at));
    if (d) d.waterMl += w.ml;
  }
  const checkinDays = new Set(input.checkins.map((c) => c.date).filter((k) => inWeek.has(k)));
  for (const k of checkinDays) totals.get(k)!.checkedIn = true;

  const t = input.targets;
  const days = [...totals.values()];
  const scores = t
    ? days
        .map((d) =>
          adherenceScore(
            { ...d, logged: d.food || d.waterMl > 0 || d.checkedIn },
            { calories: t.calories, proteinG: t.proteinG, waterMl: t.waterMl },
          ),
        )
        .filter((s): s is number => s !== null)
    : [];

  return {
    start,
    end,
    daysLogged: days.filter((d) => d.food).length,
    daysOnTarget: t
      ? days.filter(
          (d) =>
            d.food &&
            d.calories >= t.calories * ON_TARGET[0] &&
            d.calories <= t.calories * ON_TARGET[1],
        ).length
      : 0,
    waterDays: t ? days.filter((d) => t.waterMl > 0 && d.waterMl >= t.waterMl).length : 0,
    checkins: checkinDays.size,
    avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    weightChangeKg: weightChange(input.weights, start),
    streakDays: input.streakDays,
    level: levelFor(input.xp).level,
    badges: input.badges
      .filter((b) => new Date(b.unlockedAt) >= start)
      .sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt))
      .map((b) => ({ title: b.title, emoji: b.emoji ?? '🏅' })),
  };
}

function weightChange(weights: StoryInput['weights'], start: Date): number | null {
  const rows = weights
    .filter((w): w is { measured_at: string; weight_kg: number } => w.weight_kg !== null)
    .sort((a, b) => a.measured_at.localeCompare(b.measured_at));
  const before = rows.filter((w) => new Date(w.measured_at) < start);
  const during = rows.filter((w) => new Date(w.measured_at) >= start);
  const last = during.at(-1);
  const base = before.at(-1) ?? (during.length > 1 ? during[0] : undefined);
  if (!last || !base) return null;
  return Math.round((last.weight_kg - base.weight_kg) * 10) / 10;
}
