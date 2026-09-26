import { addDays, dayKey, startOfDay } from '@/lib/dates';
import { optional, required, supabase } from '@/lib/supabase';

import { GLASS_ML, type HomeData } from './summary';

/** Everything the home screen needs: profile, current plan, and the last 7 days of logs. */
export async function loadHome(userId: string, now: Date): Promise<HomeData> {
  const since = addDays(startOfDay(now), -6);
  const [profile, plans, food, water, checkins] = await Promise.all([
    supabase.from('profiles').select('name, xp, streak_days, units').eq('user_id', userId).single(),
    supabase
      .from('plans')
      .select('daily_calories, protein_g, carbs_g, fat_g, water_ml')
      .eq('user_id', userId)
      .order('version', { ascending: false })
      .limit(1),
    supabase
      .from('food_logs')
      .select('id, logged_at, meal_slot, name, calories, protein_g, carbs_g, fat_g')
      .eq('user_id', userId)
      .gte('logged_at', since.toISOString())
      .order('logged_at'),
    supabase
      .from('water_logs')
      .select('id, logged_at, ml')
      .eq('user_id', userId)
      .gte('logged_at', since.toISOString())
      .order('logged_at'),
    supabase.from('checkins').select('date, mood').eq('user_id', userId).gte('date', dayKey(since)),
  ]);
  return {
    profile: required(profile),
    plan: optional(plans)?.[0] ?? null,
    food: optional(food) ?? [],
    water: optional(water) ?? [],
    checkins: optional(checkins) ?? [],
  };
}

export async function addGlass(userId: string): Promise<void> {
  optional(await supabase.from('water_logs').insert({ user_id: userId, ml: GLASS_ML }));
}

export async function removeWaterLog(id: string): Promise<void> {
  optional(await supabase.from('water_logs').delete().eq('id', id));
}
