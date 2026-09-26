import { FunctionsHttpError } from '@supabase/supabase-js';

import { optional, supabase } from '@/lib/supabase';

import type { MealSlot } from './types';

/** Mirrors MealPlan in supabase/functions/generate-meal-plan/plan.ts. */
export interface PlannedItem {
  name: string;
  foodRef: string;
  source: string;
  grams: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface MealPlan {
  date: string;
  slots: Record<MealSlot, PlannedItem[]>;
  totals: { kcal: number; proteinG: number; carbsG: number; fatG: number };
}

export interface MealPlanDay {
  plan: MealPlan | null;
  /** Meals of this day unlocked by a verified rewarded ad (one video per meal). */
  unlockedSlots: MealSlot[];
}

const MEAL_SLOT_LIST: MealSlot[] = ['breakfast', 'lunch', 'snack', 'dinner'];

/** ad_unlocks.target_id for one meal: "YYYY-MM-DD:slot". */
export const unlockTarget = (date: string, slot: MealSlot) => `${date}:${slot}`;

export async function loadMealPlan(userId: string, date: string): Promise<MealPlanDay> {
  const [plans, unlocks] = await Promise.all([
    supabase.from('meal_plans').select('meals').eq('user_id', userId).eq('date', date).limit(1),
    supabase
      .from('ad_unlocks')
      .select('target_id')
      .eq('user_id', userId)
      .eq('unlock_type', 'meal_plan')
      .in(
        'target_id',
        MEAL_SLOT_LIST.map((s) => unlockTarget(date, s)),
      ),
  ]);
  const meals = optional(plans)?.[0]?.meals as MealPlan | undefined;
  const targets = new Set((optional(unlocks) ?? []).map((u) => u.target_id));
  return {
    plan: meals?.slots ? meals : null,
    unlockedSlots: MEAL_SLOT_LIST.filter((s) => targets.has(unlockTarget(date, s))),
  };
}

export type MealPlanErrorCode =
  | 'not_configured'
  | 'generation_failed'
  | 'no_targets'
  | 'premium_required'
  | 'regenerate_limit'
  | 'rate_limited'
  | 'failed';

export class MealPlanError extends Error {
  readonly code: MealPlanErrorCode;
  constructor(code: MealPlanErrorCode) {
    super(code);
    this.code = code;
  }
}

export async function generateMealPlan(date: string, regenerate: boolean): Promise<MealPlan> {
  const { data, error } = await supabase.functions.invoke('generate-meal-plan', {
    body: { date, regenerate },
  });
  if (error) {
    let code: MealPlanErrorCode = 'failed';
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
      const known: MealPlanErrorCode[] = [
        'not_configured',
        'generation_failed',
        'no_targets',
        'premium_required',
        'regenerate_limit',
        'rate_limited',
      ];
      if (known.includes(body?.error as MealPlanErrorCode)) code = body!.error as MealPlanErrorCode;
    }
    throw new MealPlanError(code);
  }
  return (data as { plan: MealPlan }).plan;
}
