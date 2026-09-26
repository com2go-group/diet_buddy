import type { Enums } from '@/lib/supabase';

export type Mood = Enums<'mood'>;
export type Hunger = Enums<'hunger_level'>;

export const MOODS: readonly { id: Mood; emoji: string }[] = [
  { id: 'great', emoji: '😄' },
  { id: 'good', emoji: '🙂' },
  { id: 'okay', emoji: '😐' },
  { id: 'low', emoji: '😔' },
  { id: 'tough', emoji: '😫' },
];
export const ENERGY_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export const SLEEP_HOURS = [5, 6, 7, 8, 9, 10] as const;
export const HUNGER_LEVELS: readonly Hunger[] = ['very_low', 'low', 'normal', 'high', 'very_high'];

export const CHECKIN_STEPS = ['mood', 'energy', 'sleep', 'hunger', 'weight'] as const;
export type CheckInStep = (typeof CHECKIN_STEPS)[number];

/** Same bounds as the checkins.weight_kg check constraint. */
export const WEIGHT_MIN_KG = 30;
export const WEIGHT_MAX_KG = 350;

export interface CheckInAnswers {
  mood: Mood;
  energy: number;
  sleepHours: number;
  hunger: Hunger;
  /** Null when skipped. */
  weightKg: number | null;
}

/** Defaults match the prototype (Good, 7/10, 7 h, Normal); weight starts at the latest reading. */
export function initialAnswers(latestWeightKg: number | null): CheckInAnswers {
  return { mood: 'good', energy: 7, sleepHours: 7, hunger: 'normal', weightKg: latestWeightKg };
}

export function isValidWeight(kg: number | null): boolean {
  return kg === null || (kg >= WEIGHT_MIN_KG && kg <= WEIGHT_MAX_KG);
}

export function energyTip(energy: number): 'energyHigh' | 'energyMid' | 'energyLow' {
  if (energy >= 8) return 'energyHigh';
  if (energy >= 5) return 'energyMid';
  return 'energyLow';
}

export function sleepTip(hours: number): 'sleepGood' | 'sleepOk' | 'sleepLow' {
  if (hours >= 8) return 'sleepGood';
  if (hours >= 6) return 'sleepOk';
  return 'sleepLow';
}

/** Aria's templated reply on the done screen. Low moods get supportive wording, never diet advice. */
export function coachMessage(mood: Mood): 'messageGood' | 'messageLow' {
  return mood === 'great' || mood === 'good' ? 'messageGood' : 'messageLow';
}
