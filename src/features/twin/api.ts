import { optional, required, supabase, type Enums } from '@/lib/supabase';
import type { Sex } from '@/lib/nutrition';

import { parseLook, type MetricPoint, type TwinLook } from './twin';

export interface TwinData {
  look: TwinLook;
  sex: Sex;
  heightCm: number | null;
  birthDate: Date | null;
  units: Enums<'unit_system'>;
  metrics: MetricPoint[];
  goal: { goalKg: number | null; goalDate: string | null } | null;
  weeklyChangeKg: number | null;
}

export async function loadTwin(userId: string): Promise<TwinData> {
  const [profile, metrics, goals, plans] = await Promise.all([
    supabase
      .from('profiles')
      .select('gender, birth_date, height_cm, units, avatar')
      .eq('user_id', userId)
      .single(),
    supabase
      .from('body_metrics')
      .select('measured_at, weight_kg, body_fat_pct')
      .eq('user_id', userId)
      .not('weight_kg', 'is', null)
      .order('measured_at')
      .limit(1000),
    supabase
      .from('goals')
      .select('goal_weight_kg, goal_date')
      .eq('user_id', userId)
      .eq('active', true)
      .limit(1),
    supabase
      .from('plans')
      .select('forecast')
      .eq('user_id', userId)
      .order('version', { ascending: false })
      .limit(1),
  ]);
  const p = required(profile);
  const sex: Sex = p.gender ?? 'unspecified';
  const goal = optional(goals)?.[0];
  const forecast = optional(plans)?.[0]?.forecast as { weekly_change_kg?: unknown } | null;
  return {
    look: parseLook(p.avatar, p.gender),
    sex,
    heightCm: p.height_cm === null ? null : Number(p.height_cm),
    birthDate: p.birth_date ? new Date(`${p.birth_date}T12:00:00`) : null,
    units: p.units,
    metrics: (optional(metrics) ?? []).map((m) => ({
      measured_at: m.measured_at,
      weight_kg: m.weight_kg === null ? null : Number(m.weight_kg),
      body_fat_pct: m.body_fat_pct === null ? null : Number(m.body_fat_pct),
    })),
    goal: goal
      ? {
          goalKg: goal.goal_weight_kg === null ? null : Number(goal.goal_weight_kg),
          goalDate: goal.goal_date,
        }
      : null,
    weeklyChangeKg:
      typeof forecast?.weekly_change_kg === 'number' ? forecast.weekly_change_kg : null,
  };
}

export async function saveLook(userId: string, look: TwinLook): Promise<void> {
  optional(
    await supabase
      .from('profiles')
      .update({ avatar: { variant: look.variant, skin: look.skin, hair: look.hair } })
      .eq('user_id', userId),
  );
}
