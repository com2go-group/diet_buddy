import { dayKey } from '@/lib/dates';
import { ageOn, bmi, estimateBodyFatPct, type Sex } from '@/lib/nutrition';

export type TwinVariant = 'male' | 'female' | 'other';

/** The look the user picks; the body shape always comes from their measurements. */
export interface TwinLook {
  variant: TwinVariant;
  /** Index into SKIN_TONES. */
  skin: number;
  /** Index into HAIR_COLOURS. */
  hair: number;
}

export const SKIN_TONES = ['#FDE3CF', '#F5C9A6', '#E0A77E', '#C68656', '#8D5A3B', '#5C3A26'];
export const HAIR_COLOURS = ['#1F1B18', '#4A2C1D', '#7B4A2A', '#D8B25A', '#B5502A', '#A8A8A8'];
const VARIANTS: readonly TwinVariant[] = ['male', 'female', 'other'];

export function defaultLook(sex: Sex | null): TwinLook {
  return { variant: sex === 'male' || sex === 'female' ? sex : 'other', skin: 1, hair: 1 };
}

const validIndex = (v: unknown, list: readonly string[]) =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < list.length;

/** The stored look, or the default for the user's gender when missing or malformed. */
export function parseLook(value: unknown, sex: Sex | null): TwinLook {
  const fallback = defaultLook(sex);
  if (!value || typeof value !== 'object') return fallback;
  const v = value as Record<string, unknown>;
  return {
    variant: VARIANTS.includes(v.variant as TwinVariant)
      ? (v.variant as TwinVariant)
      : fallback.variant,
    skin: validIndex(v.skin, SKIN_TONES) ? (v.skin as number) : fallback.skin,
    hair: validIndex(v.hair, HAIR_COLOURS) ? (v.hair as number) : fallback.hair,
  };
}

/**
 * Body-fat range drawn from slimmest (0) to fullest (1) per variant. The lower ends are healthy
 * athletic levels, so the drawing never goes thinner than that (CLAUDE.md §9: no ideal of
 * extreme leanness).
 */
const FAT_RANGE: Record<TwinVariant, [number, number]> = {
  male: [10, 40],
  female: [18, 48],
  other: [14, 44],
};

/** 0–1 "fullness" of the drawing for a body-fat %. */
export function fullness(bodyFatPct: number, variant: TwinVariant): number {
  const [lo, hi] = FAT_RANGE[variant];
  return Math.min(1, Math.max(0, (bodyFatPct - lo) / (hi - lo)));
}

export interface MetricPoint {
  measured_at: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
}

export type FrameKind = 'start' | 'month' | 'now' | 'goal';

export interface TwinFrame {
  kind: FrameKind;
  /** Local YYYY-MM-DD; null for a goal without an estimated date. */
  date: string | null;
  weightKg: number;
  bodyFatPct: number;
  /** Body fat estimated from BMI rather than measured. */
  estimatedFat: boolean;
}

export interface TwinInput {
  metrics: MetricPoint[];
  sex: Sex;
  heightCm: number;
  birthDate: Date | null;
  goal: { goalKg: number | null; goalDate: string | null } | null;
  /** Planned weekly change (negative = loss), from the current plan. */
  weeklyChangeKg: number | null;
  now: Date;
}

/** Age used when the birth date is missing (only affects the BMI-based body-fat estimate). */
const FALLBACK_AGE = 35;
export const MAX_MONTH_FRAMES = 10;
/** A goal closer than this to the current weight gets no separate frame. */
const MIN_GOAL_GAP_KG = 0.5;

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * The twin's timeline: the first weigh-in, the last weigh-in of each month in between (at most
 * MAX_MONTH_FRAMES, evenly spaced), the latest one, and a projected goal. Body fat uses the
 * measured value when there is one, else the BMI-based estimate for the age at that date.
 */
export function twinFrames(input: TwinInput): TwinFrame[] {
  const { sex, heightCm, birthDate, now } = input;
  const rows = input.metrics
    .filter((m): m is MetricPoint & { weight_kg: number } => m.weight_kg !== null)
    .sort((a, b) => a.measured_at.localeCompare(b.measured_at));
  if (!rows.length) return [];

  const estimate = (weightKg: number, at: Date) =>
    estimateBodyFatPct({
      sex,
      heightCm,
      weightKg,
      ageYears: birthDate ? Math.max(18, ageOn(birthDate, at)) : FALLBACK_AGE,
    });
  const toFrame = (kind: FrameKind, m: MetricPoint & { weight_kg: number }): TwinFrame => {
    const at = new Date(m.measured_at);
    return {
      kind,
      date: dayKey(at),
      weightKg: m.weight_kg,
      bodyFatPct: round1(m.body_fat_pct ?? estimate(m.weight_kg, at)),
      estimatedFat: m.body_fat_pct === null,
    };
  };

  const first = rows[0]!;
  const last = rows[rows.length - 1]!;
  const frames: TwinFrame[] = [];
  if (rows.length > 1) {
    frames.push(toFrame('start', first));
    // Last weigh-in of each calendar month strictly between the first and latest months.
    const byMonth = new Map<string, MetricPoint & { weight_kg: number }>();
    const monthOf = (m: MetricPoint) => dayKey(new Date(m.measured_at)).slice(0, 7);
    for (const m of rows) byMonth.set(monthOf(m), m);
    byMonth.delete(monthOf(first));
    byMonth.delete(monthOf(last));
    const months = [...byMonth.values()];
    const step = Math.max(1, months.length / MAX_MONTH_FRAMES);
    for (let i = 0; i < months.length; i += step) {
      frames.push(toFrame('month', months[Math.floor(i)]!));
    }
  }
  const current = toFrame('now', last);
  frames.push(current);

  const goalKg = input.goal?.goalKg ?? null;
  if (goalKg !== null && Math.abs(goalKg - current.weightKg) >= MIN_GOAL_GAP_KG) {
    // Keep the gap between measured and estimated body fat, so a tape or scan result carries over.
    const offset = current.estimatedFat ? 0 : current.bodyFatPct - estimate(current.weightKg, now);
    const lo = FAT_RANGE[sex === 'male' ? 'male' : sex === 'female' ? 'female' : 'other'][0];
    frames.push({
      kind: 'goal',
      date: goalDate(input, current.weightKg, goalKg),
      weightKg: goalKg,
      bodyFatPct: round1(Math.max(lo, estimate(goalKg, now) + offset)),
      estimatedFat: true,
    });
  }
  return frames;
}

/** The goal date from the goal, else from the plan's weekly rate; null when neither fits. */
function goalDate(input: TwinInput, currentKg: number, goalKg: number): string | null {
  const today = dayKey(input.now);
  if (input.goal?.goalDate && input.goal.goalDate > today) return input.goal.goalDate;
  const rate = input.weeklyChangeKg;
  const diff = goalKg - currentKg;
  if (!rate || Math.sign(rate) !== Math.sign(diff)) return null;
  const days = Math.ceil((diff / rate) * 7);
  return dayKey(new Date(input.now.getTime() + days * 86_400_000));
}

/** BMI for a frame, for the details line. */
export function frameBmi(frame: TwinFrame, heightCm: number): number {
  return round1(bmi(frame.weightKg, heightCm));
}
