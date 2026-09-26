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
  /** Unlocked for this day by a verified rewarded ad. */
  unlocked: boolean;
}

export async function loadMealPlan(userId: string, date: string): Promise<MealPlanDay> {
  const [plans, unlocks] = await Promise.all([
    supabase.from('meal_plans').select('meals').eq('user_id', userId).eq('date', date).limit(1),
    supabase
      .from('ad_unlocks')
      .select('id')
      .eq('user_id', userId)
      .eq('unlock_type', 'meal_plan')
      .eq('target_id', date)
      .limit(1),
  ]);
  const meals = optional(plans)?.[0]?.meals as MealPlan | undefined;
  return { plan: meals?.slots ? meals : null, unlocked: (optional(unlocks) ?? []).length > 0 };
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
