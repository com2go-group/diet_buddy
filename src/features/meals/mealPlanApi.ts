import { FunctionsHttpError } from '@supabase/supabase-js';

import { aiHeaders, boostFrom, type AiBoost } from '@/lib/ai/headers';
import { optional, supabase } from '@/lib/supabase';

import type { MealSlot } from './types';
import { getLanguage } from '@/i18n';

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

export interface Dish {
  title: string;
  description: string;
  /** Short recipe steps, without amounts (newer plans). */
  steps?: string[];
  prepMinutes?: number;
  /** Lunch made from yesterday's dinner ("cook once, eat twice"). */
  leftover?: boolean;
  /** Ingredients the user swapped. */
  swapped?: { from: string; to: string }[];
}

export interface MealPlan {
  date: string;
  /** Each meal's ingredients. */
  slots: Record<MealSlot, PlannedItem[]>;
  /** Each meal as a dish; older plans only have ingredients (see dishOf). */
  dishes?: Partial<Record<MealSlot, Dish>>;
  /** Meals the user skipped today. */
  skipped?: MealSlot[];
  totals: { kcal: number; proteinG: number; carbsG: number; fatG: number };
}

/** A meal as a dish; for older plans the ingredients stand in for the title. */
export function dishOf(plan: MealPlan, slot: MealSlot): Dish {
  return (
    plan.dishes?.[slot] ?? {
      title: (plan.slots[slot] ?? []).map((i) => i.name).join(', '),
      description: '',
    }
  );
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
  | 'ai_unavailable'
  | 'food_data_unavailable'
  | 'alternative_limit'
  | 'ai_budget'
  | 'no_plan'
  | 'swap_limit'
  | 'failed';

export class MealPlanError extends Error {
  readonly code: MealPlanErrorCode;
  /** A rewarded video that adds more meal ideas today, when the server offers one. */
  readonly boost: AiBoost | null;
  constructor(code: MealPlanErrorCode, boost: AiBoost | null = null) {
    super(code);
    this.code = code;
    this.boost = boost;
  }
}

export function generateMealPlan(date: string, regenerate: boolean): Promise<MealPlan> {
  return callMealPlan({ date, regenerate });
}

/** "Another idea" for one meal, or skipping / un-skipping it (today's plan only). */
export function mealPlanAction(
  date: string,
  action: 'alternative' | 'skip' | 'unskip',
  slot: MealSlot,
): Promise<MealPlan> {
  return callMealPlan({ date, action, slot });
}

/** Replaces one ingredient of a meal in today's plan (checked on the server like any plan food). */
export function swapIngredient(date: string, slot: MealSlot, index: number): Promise<MealPlan> {
  return callMealPlan({ date, action: 'swap', slot, index });
}

async function callMealPlan(body: Record<string, unknown>): Promise<MealPlan> {
  const { data, error } = await supabase.functions.invoke('generate-meal-plan', {
    headers: aiHeaders(),
    body: { ...body, language: getLanguage() },
  });
  if (error) {
    let code: MealPlanErrorCode = 'failed';
    let boost: AiBoost | null = null;
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
      const known: MealPlanErrorCode[] = [
        'not_configured',
        'generation_failed',
        'no_targets',
        'premium_required',
        'regenerate_limit',
        'rate_limited',
        'ai_unavailable',
        'food_data_unavailable',
        'alternative_limit',
        'ai_budget',
        'no_plan',
        'swap_limit',
      ];
      if (known.includes(body?.error as MealPlanErrorCode)) code = body!.error as MealPlanErrorCode;
      boost = boostFrom(body);
    }
    throw new MealPlanError(code, boost);
  }
  return (data as { plan: MealPlan }).plan;
}
