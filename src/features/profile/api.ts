import { dayKey } from '@/lib/dates';
import { optional, required, supabase, type Enums, type Tables } from '@/lib/supabase';

import type { CurrentPlan } from './goals';

export interface ProfileOverview {
  profile: Pick<
    Tables<'profiles'>,
    'name' | 'gender' | 'units' | 'is_premium' | 'streak_days' | 'xp'
  >;
  plan: CurrentPlan | null;
  goal: {
    startKg: number | null;
    goalKg: number | null;
    goalDate: string | null;
    losing: boolean;
  } | null;
  latest: { weightKg: number | null; bmr: number | null; tdee: number | null };
  stats: { loggedDays: number; mealsLogged: number; goalProgress: number | null };
  checkedInToday: boolean;
}

export async function loadOverview(userId: string, now: Date): Promise<ProfileOverview> {
  const [profile, plans, goals, weights, energy, food, checkin] = await Promise.all([
    supabase
      .from('profiles')
      .select('name, gender, units, is_premium, streak_days, xp')
      .eq('user_id', userId)
      .single(),
    supabase
      .from('plans')
      .select(
        'version, daily_calories, protein_g, carbs_g, fat_g, fiber_g, water_ml, exercise_recommendation, forecast',
      )
      .eq('user_id', userId)
      .order('version', { ascending: false })
      .limit(1),
    supabase
      .from('goals')
      .select('start_weight_kg, goal_weight_kg, goal_date, goal_types')
      .eq('user_id', userId)
      .eq('active', true)
      .limit(1),
    supabase
      .from('body_metrics')
      .select('weight_kg')
      .eq('user_id', userId)
      .not('weight_kg', 'is', null)
      .order('measured_at', { ascending: false })
      .limit(1),
    supabase
      .from('body_metrics')
      .select('bmr, tdee')
      .eq('user_id', userId)
      .not('bmr', 'is', null)
      .order('measured_at', { ascending: false })
      .limit(1),
    supabase.from('food_logs').select('logged_at').eq('user_id', userId).limit(10000),
    supabase.from('checkins').select('id').eq('user_id', userId).eq('date', dayKey(now)).limit(1),
  ]);
  const g = optional(goals)?.[0];
  const weightKg = optional(weights)?.[0]?.weight_kg ?? null;
  const e = optional(energy)?.[0];
  const logs = optional(food) ?? [];
  const losing = Boolean(g?.goal_types.includes('lose_fat'));
  const start = g?.start_weight_kg ?? null;
  const target = g?.goal_weight_kg ?? null;
  const progress =
    losing && start !== null && target !== null && weightKg !== null && start > target
      ? Math.round(Math.min(1, Math.max(0, (start - weightKg) / (start - target))) * 100)
      : null;
  return {
    profile: required(profile),
    plan: (optional(plans)?.[0] as CurrentPlan | undefined) ?? null,
    goal: g ? { startKg: start, goalKg: target, goalDate: g.goal_date, losing } : null,
    latest: { weightKg, bmr: e?.bmr ?? null, tdee: e?.tdee ?? null },
    stats: {
      loggedDays: new Set(logs.map((l) => dayKey(new Date(l.logged_at)))).size,
      mealsLogged: logs.length,
      goalProgress: progress,
    },
    checkedInToday: (optional(checkin) ?? []).length > 0,
  };
}

export async function setUnits(userId: string, units: Enums<'unit_system'>): Promise<void> {
  optional(await supabase.from('profiles').update({ units }).eq('user_id', userId));
}

/** Saves an edited plan as a new version (history is kept). */
export async function savePlanVersion(userId: string, plan: CurrentPlan): Promise<void> {
  optional(
    await supabase.from('plans').insert({
      user_id: userId,
      version: plan.version,
      daily_calories: plan.daily_calories,
      protein_g: plan.protein_g,
      carbs_g: plan.carbs_g,
      fat_g: plan.fat_g,
      fiber_g: plan.fiber_g,
      water_ml: plan.water_ml,
      exercise_recommendation:
        plan.exercise_recommendation as Tables<'plans'>['exercise_recommendation'],
      forecast: plan.forecast as Tables<'plans'>['forecast'],
      generated_by: 'profile',
    }),
  );
}

export type Consent = Pick<
  Tables<'consents'>,
  'consent_type' | 'granted' | 'version' | 'updated_at'
>;

export async function loadConsents(userId: string): Promise<Consent[]> {
  const result = await supabase
    .from('consents')
    .select('consent_type, granted, version, updated_at')
    .eq('user_id', userId);
  return optional(result) ?? [];
}

/** Privacy notice version that optional consents are given against. */
export const OPTIONAL_CONSENT_VERSION = '2026-09-26';

/** Optional consents (analytics, marketing). Health data is withdrawn by deleting the account. */
export async function setConsent(type: 'analytics' | 'marketing', granted: boolean): Promise<void> {
  optional(
    await supabase.rpc('set_consent', {
      p_type: type,
      p_granted: granted,
      p_version: OPTIONAL_CONSENT_VERSION,
    }),
  );
}

export async function exportData(): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke('export-data', { method: 'POST' });
  if (error) throw error;
  return data;
}

/** Deletes the account on the server, then clears the local session (the user no longer exists). */
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account', {
    body: { confirm: 'DELETE' },
  });
  if (error) throw error;
  await supabase.auth.signOut({ scope: 'local' });
}
