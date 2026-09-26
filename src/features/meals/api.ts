import { FunctionsHttpError } from '@supabase/supabase-js';

import { addDays } from '@/lib/dates';
import { optional, supabase } from '@/lib/supabase';

import { dayRange } from './portion';
import {
  foodPhotoResponseSchema,
  foodSearchResponseSchema,
  type FoodLog,
  type FoodPhotoResult,
  type FoodResult,
  type NewFoodLog,
} from './types';

const LOG_COLUMNS =
  'id, logged_at, meal_slot, food_ref, name, quantity, unit, calories, protein_g, carbs_g, fat_g, source';

export interface MealsDay {
  logs: FoodLog[];
  targets: { calories: number; proteinG: number; carbsG: number; fatG: number } | null;
}

export async function loadMealsDay(userId: string, day: Date): Promise<MealsDay> {
  const [start, end] = dayRange(day);
  const [logs, plans] = await Promise.all([
    supabase
      .from('food_logs')
      .select(LOG_COLUMNS)
      .eq('user_id', userId)
      .gte('logged_at', start.toISOString())
      .lt('logged_at', end.toISOString())
      .order('logged_at'),
    supabase
      .from('plans')
      .select('daily_calories, protein_g, carbs_g, fat_g')
      .eq('user_id', userId)
      .order('version', { ascending: false })
      .limit(1),
  ]);
  const plan = optional(plans)?.[0];
  return {
    logs: optional(logs) ?? [],
    targets: plan
      ? {
          calories: plan.daily_calories,
          proteinG: plan.protein_g,
          carbsG: plan.carbs_g,
          fatG: plan.fat_g,
        }
      : null,
  };
}

/** The last 30 days of logs, for the "Recent" list. */
export async function loadRecentLogs(userId: string, now: Date): Promise<FoodLog[]> {
  const result = await supabase
    .from('food_logs')
    .select(LOG_COLUMNS)
    .eq('user_id', userId)
    .gte('logged_at', addDays(now, -30).toISOString())
    .order('logged_at', { ascending: false })
    .limit(200);
  return optional(result) ?? [];
}

export type SearchErrorCode = 'not_configured' | 'rate_limited' | 'failed';

export class FoodSearchError extends Error {
  constructor(readonly code: SearchErrorCode) {
    super(code);
  }
}

/** USDA search through the food-search Edge Function (the API key never ships in the app). */
export async function searchFoods(query: string): Promise<FoodResult[]> {
  const { data, error } = await supabase.functions.invoke('food-search', { body: { query } });
  if (error) {
    let code: SearchErrorCode = 'failed';
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
      if (body?.error === 'not_configured' || body?.error === 'rate_limited') code = body.error;
    }
    throw new FoodSearchError(code);
  }
  const parsed = foodSearchResponseSchema.safeParse(data);
  if (!parsed.success) throw new FoodSearchError('failed');
  return parsed.data.foods;
}

export type PhotoErrorCode =
  'not_configured' | 'limit_reached' | 'rate_limited' | 'invalid_image' | 'failed';

export class FoodPhotoError extends Error {
  constructor(readonly code: PhotoErrorCode) {
    super(code);
  }
}

const PHOTO_CODES: PhotoErrorCode[] = [
  'not_configured',
  'limit_reached',
  'rate_limited',
  'invalid_image',
];

/** Sends a base64 photo to the analyze-food-photo Edge Function (it is not stored). */
export async function analyzeFoodPhoto(image: string): Promise<FoodPhotoResult> {
  const { data, error } = await supabase.functions.invoke('analyze-food-photo', {
    body: { image },
  });
  if (error) {
    let code: PhotoErrorCode = 'failed';
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
      const found = PHOTO_CODES.find((c) => c === body?.error);
      if (found) code = found;
    }
    throw new FoodPhotoError(code);
  }
  const parsed = foodPhotoResponseSchema.safeParse(data);
  if (!parsed.success) throw new FoodPhotoError('failed');
  return parsed.data;
}

export async function logFood(userId: string, entry: NewFoodLog): Promise<void> {
  optional(
    await supabase.from('food_logs').insert({
      user_id: userId,
      logged_at: entry.loggedAt.toISOString(),
      meal_slot: entry.slot,
      food_ref: entry.foodRef,
      name: entry.name.trim().slice(0, 200),
      quantity: entry.quantity === null ? null : Math.round(entry.quantity * 100) / 100,
      unit: entry.unit?.trim().slice(0, 32) || null,
      calories: entry.macros.kcal,
      protein_g: entry.macros.proteinG,
      carbs_g: entry.macros.carbsG,
      fat_g: entry.macros.fatG,
      source: entry.source,
    }),
  );
}

export async function deleteFoodLog(id: string): Promise<void> {
  optional(await supabase.from('food_logs').delete().eq('id', id));
}
