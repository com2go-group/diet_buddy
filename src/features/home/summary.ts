import { addDays, dayKey, startOfDay, weekdayKey, type WeekdayKey } from '@/lib/dates';
import { adherenceScore, type DayTargets } from '@/lib/nutrition';
import type { Enums, Tables } from '@/lib/supabase';

export type FoodLog = Pick<
  Tables<'food_logs'>,
  'id' | 'logged_at' | 'meal_slot' | 'name' | 'calories' | 'protein_g' | 'carbs_g' | 'fat_g'
>;
export type WaterLog = Pick<Tables<'water_logs'>, 'id' | 'logged_at' | 'ml'>;
export type CheckIn = Pick<Tables<'checkins'>, 'date' | 'mood'>;
export type PlanTargets = Pick<
  Tables<'plans'>,
  'daily_calories' | 'protein_g' | 'carbs_g' | 'fat_g' | 'water_ml'
>;

export interface HomeData {
  profile: Pick<Tables<'profiles'>, 'name' | 'xp' | 'streak_days' | 'units'>;
  plan: PlanTargets | null;
  food: FoodLog[];
  water: WaterLog[];
  checkins: CheckIn[];
}

export const MEAL_SLOTS: readonly Enums<'meal_slot'>[] = ['breakfast', 'lunch', 'snack', 'dinner'];

export interface HomeSummary {
  today: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    waterMl: number;
    glasses: number;
    checkIn: CheckIn | null;
    meals: Record<Enums<'meal_slot'>, FoodLog[]>;
    score: number | null;
  };
  targets: (DayTargets & { carbsG: number; fatG: number }) | null;
  week: { key: string; weekday: WeekdayKey; score: number | null; isToday: boolean }[];
  lastWaterLogId: string | null;
}

export const GLASS_ML = 250;

const sum = <T>(rows: T[], pick: (r: T) => number) => rows.reduce((total, r) => total + pick(r), 0);

/** Today's totals, the score and the last 7 days' adherence, from the loaded rows. */
export function summarizeHome(data: HomeData, now: Date): HomeSummary {
  const targets = data.plan
    ? {
        calories: data.plan.daily_calories,
        proteinG: data.plan.protein_g,
        carbsG: data.plan.carbs_g,
        fatG: data.plan.fat_g,
        waterMl: data.plan.water_ml,
      }
    : null;

  const byDay = (key: string) => {
    const food = data.food.filter((f) => dayKey(new Date(f.logged_at)) === key);
    const water = data.water.filter((w) => dayKey(new Date(w.logged_at)) === key);
    const checkIn = data.checkins.find((c) => c.date === key) ?? null;
    return { food, water, checkIn };
  };

  const scoreFor = (key: string) => {
    if (!targets) return null;
    const { food, water, checkIn } = byDay(key);
    return adherenceScore(
      {
        calories: sum(food, (f) => f.calories),
        proteinG: sum(food, (f) => f.protein_g),
        waterMl: sum(water, (w) => w.ml),
        checkedIn: checkIn !== null,
        logged: food.length > 0 || water.length > 0 || checkIn !== null,
      },
      targets,
    );
  };

  const todayKey = dayKey(now);
  const today = byDay(todayKey);
  const meals = Object.fromEntries(
    MEAL_SLOTS.map((slot) => [slot, today.food.filter((f) => f.meal_slot === slot)]),
  ) as HomeSummary['today']['meals'];
  const waterMl = sum(today.water, (w) => w.ml);
  const sortedWater = [...today.water].sort((a, b) => a.logged_at.localeCompare(b.logged_at));

  return {
    today: {
      calories: sum(today.food, (f) => f.calories),
      proteinG: sum(today.food, (f) => f.protein_g),
      carbsG: sum(today.food, (f) => f.carbs_g),
      fatG: sum(today.food, (f) => f.fat_g),
      waterMl,
      glasses: Math.floor(waterMl / GLASS_ML),
      checkIn: today.checkIn,
      meals,
      score: scoreFor(todayKey),
    },
    targets,
    week: Array.from({ length: 7 }, (_, i) => {
      const date = addDays(startOfDay(now), i - 6);
      const key = dayKey(date);
      return { key, weekday: weekdayKey(date), score: scoreFor(key), isToday: key === todayKey };
    }),
    lastWaterLogId: sortedWater.at(-1)?.id ?? null,
  };
}

export type InsightKind =
  'startDay' | 'nothingLogged' | 'lowProtein' | 'lowWater' | 'overCalories' | 'checkIn' | 'onTrack';

/**
 * Rule-based coach tip for the home card until the AI coach exists (Phase 1 item 11).
 * Gentle wording only; it never suggests eating less than the plan.
 */
export function homeInsight(summary: HomeSummary, hour: number): InsightKind {
  const { today, targets } = summary;
  if (!targets) return 'onTrack';
  const loggedFood = today.calories > 0;
  if (!loggedFood) return hour < 11 ? 'startDay' : 'nothingLogged';
  if (today.calories > targets.calories * 1.1) return 'overCalories';
  if (hour >= 14 && today.proteinG < targets.proteinG * 0.5) return 'lowProtein';
  if (hour >= 14 && today.waterMl < targets.waterMl * 0.5) return 'lowWater';
  if (!today.checkIn) return 'checkIn';
  return 'onTrack';
}

export type ScoreMessage = 'none' | 'low' | 'mid' | 'high';

export function scoreMessage(score: number | null): ScoreMessage {
  if (score === null) return 'none';
  if (score < 50) return 'low';
  if (score < 80) return 'mid';
  return 'high';
}
