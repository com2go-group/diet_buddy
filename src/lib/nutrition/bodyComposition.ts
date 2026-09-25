import { bmi } from './bmi';
import type { Body } from './types';
import { assertValidBody } from './validation';

/**
 * Estimated body fat % from BMI (Deurenberg et al., 1991):
 *   BF% = 1.20 × BMI + 0.23 × age − 10.8 × S − 5.4   (S = 1 male, 0 female)
 * 'unspecified' uses S = 0.5, the average of both. This is an estimate and must be labelled so.
 * The result is clamped to 3–60 %.
 */
export function estimateBodyFatPct(body: Body): number {
  assertValidBody(body);
  const s = body.sex === 'male' ? 1 : body.sex === 'female' ? 0 : 0.5;
  const raw = 1.2 * bmi(body.weightKg, body.heightCm) + 0.23 * body.ageYears - 10.8 * s - 5.4;
  return Math.min(60, Math.max(3, raw));
}

export function fatMassKg(weightKg: number, bodyFatPct: number): number {
  return (weightKg * bodyFatPct) / 100;
}

export function leanMassKg(weightKg: number, bodyFatPct: number): number {
  return weightKg - fatMassKg(weightKg, bodyFatPct);
}

export interface CompositionBreakdown {
  fatPct: number;
  musclePct: number;
  waterPct: number;
  bonePct: number;
}

/**
 * Rough, display-only split of body weight into fat / muscle / water / bone. Lean mass is split
 * with fixed heuristic ratios (bone 7 %, muscle 55 %, the rest shown as water and other tissue).
 * It is an estimate, not a measurement, and the UI must say so (CLAUDE.md §7.3).
 * Whole-number percentages summing to exactly 100.
 */
export function estimateCompositionBreakdown(bodyFatPct: number): CompositionBreakdown {
  const fat = Math.min(100, Math.max(0, bodyFatPct));
  const lean = 100 - fat;
  const [fatPct, musclePct, waterPct, bonePct] = roundToTotal(
    [fat, lean * 0.55, lean * 0.38, lean * 0.07],
    100,
  ) as [number, number, number, number];
  return { fatPct, musclePct, waterPct, bonePct };
}

/**
 * Rounds values to integers so they sum to `total` (largest-remainder method).
 * Ties go to the earlier index.
 */
export function roundToTotal(values: number[], total: number): number[] {
  const floors = values.map(Math.floor);
  let remaining = total - floors.reduce((a, b) => a + b, 0);
  const order = values
    .map((v, i) => ({ i, rem: v - Math.floor(v) }))
    .sort((a, b) => b.rem - a.rem || a.i - b.i);
  const result = [...floors];
  for (const { i } of order) {
    if (remaining <= 0) break;
    result[i] = (result[i] ?? 0) + 1;
    remaining -= 1;
  }
  return result;
}
