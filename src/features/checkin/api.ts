import { dayKey } from '@/lib/dates';
import { optional, required, supabase } from '@/lib/supabase';

import type { CheckInAnswers } from './logic';

export interface CheckInContext {
  units: 'metric' | 'imperial';
  latestWeightKg: number | null;
  alreadyCheckedIn: boolean;
}

export async function loadCheckInContext(userId: string, now: Date): Promise<CheckInContext> {
  const [profile, metric, today] = await Promise.all([
    supabase.from('profiles').select('units').eq('user_id', userId).single(),
    supabase
      .from('body_metrics')
      .select('weight_kg')
      .eq('user_id', userId)
      .not('weight_kg', 'is', null)
      .order('measured_at', { ascending: false })
      .limit(1),
    supabase.from('checkins').select('id').eq('user_id', userId).eq('date', dayKey(now)).limit(1),
  ]);
  return {
    units: required(profile).units,
    latestWeightKg: optional(metric)?.[0]?.weight_kg ?? null,
    alreadyCheckedIn: (optional(today) ?? []).length > 0,
  };
}

export class AlreadyCheckedInError extends Error {}

/**
 * Saves today's check-in (the local date, so it matches what the user sees). The database awards
 * the XP and adds the weight to the trend; a second check-in the same day is rejected (unique key).
 */
export async function saveCheckIn(userId: string, answers: CheckInAnswers, now: Date) {
  const { error } = await supabase.from('checkins').insert({
    user_id: userId,
    date: dayKey(now),
    mood: answers.mood,
    energy: answers.energy,
    sleep_hours: answers.sleepHours,
    hunger: answers.hunger,
    weight_kg: answers.weightKg === null ? null : Math.round(answers.weightKg * 100) / 100,
  });
  if (error?.code === '23505') throw new AlreadyCheckedInError();
  if (error) throw error;
}
