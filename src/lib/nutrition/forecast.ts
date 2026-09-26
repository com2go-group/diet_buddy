import { addWeeks, weeksToGoal } from './pace';

export interface ForecastMilestone {
  kind: 'first_kg' | 'halfway' | 'goal';
  /** Kilograms lost by this milestone. */
  lostKg: number;
  weightKg: number;
  weeks: number;
  date: Date;
}

/**
 * Milestones for the goal forecast (CLAUDE.md §7.4): the first kilogram, halfway, and the goal.
 * Uses the plan's actual weekly rate (after safety caps). Empty when no loss is planned.
 * Milestones that would land on the same week as a later one are dropped.
 */
export function forecastMilestones(
  startKg: number,
  goalKg: number,
  weeklyLossKg: number,
  start: Date,
): ForecastMilestone[] {
  const total = startKg - goalKg;
  if (!(total > 0) || !(weeklyLossKg > 0)) return [];
  const points: { kind: ForecastMilestone['kind']; lostKg: number }[] = [
    { kind: 'first_kg', lostKg: 1 },
    { kind: 'halfway', lostKg: total / 2 },
    { kind: 'goal', lostKg: total },
  ];
  const milestones = points
    .filter((p) => p.kind === 'goal' || p.lostKg < total)
    .map((p) => {
      const weeks = weeksToGoal(p.lostKg, weeklyLossKg) ?? 0;
      return { ...p, weightKg: startKg - p.lostKg, weeks, date: addWeeks(start, weeks) };
    });
  return milestones.filter((m, i) => m.kind === 'goal' || m.weeks < milestones[i + 1]!.weeks);
}

/** Weekly projected weights from start to goal, for the forecast chart. */
export function forecastCurve(startKg: number, goalKg: number, weeklyLossKg: number): number[] {
  const weeks = weeksToGoal(startKg - goalKg, weeklyLossKg);
  if (weeks === null) return [startKg];
  return Array.from({ length: weeks + 1 }, (_, w) => Math.max(goalKg, startKg - w * weeklyLossKg));
}
