import type { ActivityLevel, GoalType, Pace } from '@/lib/nutrition';
import type { Enums } from '@/lib/supabase';

// Option lists from the prototype. IDs are stored in the database; labels are in src/i18n/en.ts
// under onboardingOptions and read with optionLabel().

export const GOALS: readonly { id: GoalType; emoji: string }[] = [
  { id: 'lose_fat', emoji: '🔥' },
  { id: 'build_muscle', emoji: '💪' },
  { id: 'body_recomposition', emoji: '⚖️' },
  { id: 'improve_performance', emoji: '⚡' },
  { id: 'healthy_lifestyle', emoji: '❤️' },
];

export const PACES: readonly { id: Pace; emoji: string; color: string; recommended?: boolean }[] = [
  { id: 'sustainable', emoji: '🌱', color: '#10B981' },
  { id: 'balanced', emoji: '⚖️', color: '#F59E0B', recommended: true },
  { id: 'fast', emoji: '⚡', color: '#EF4444' },
];

export const GOAL_DATES = [
  { id: 'three_months', months: 3 },
  { id: 'six_months', months: 6 },
  { id: 'twelve_months', months: 12 },
  { id: 'custom', months: null },
] as const;
export type GoalDateChoice = (typeof GOAL_DATES)[number]['id'];

export const MOTIVATIONS = [
  { id: 'appearance', emoji: '✨' },
  { id: 'health', emoji: '❤️' },
  { id: 'confidence', emoji: '🧠' },
  { id: 'muscle', emoji: '💪' },
  { id: 'sports', emoji: '🏅' },
  { id: 'special_event', emoji: '🎉' },
  { id: 'other', emoji: '🎯' },
] as const;

export const ACTIVITY_LEVELS: readonly { id: ActivityLevel; multiplier: number }[] = [
  { id: 'sedentary', multiplier: 1.2 },
  { id: 'lightly_active', multiplier: 1.375 },
  { id: 'active', multiplier: 1.55 },
  { id: 'very_active', multiplier: 1.725 },
];

export const TRAINING_FREQUENCIES: readonly Enums<'training_frequency'>[] = [
  '0_1',
  '2_3',
  '4_5',
  '6_plus',
];

export const DIET_STYLES = [
  { id: 'no_preference', emoji: '🍽️' },
  { id: 'mediterranean', emoji: '🫒' },
  { id: 'vegetarian', emoji: '🥦' },
  { id: 'vegan', emoji: '🌱' },
  { id: 'keto', emoji: '🥑' },
  { id: 'low_carb', emoji: '🥩' },
] as const;

export const RESTRICTIONS = ['halal', 'kosher', 'gluten_free', 'lactose_free', 'other'] as const;

/** Health platforms; Google Fit is left out because it is being retired (CLAUDE.md §7.12). */
export const HEALTH_PLATFORMS = [
  { id: 'healthkit', emoji: '🍎', os: 'ios' },
  { id: 'health_connect', emoji: '🟢', os: 'android' },
] as const;

/** Supported through Apple Health / Health Connect, not individual APIs (CLAUDE.md §7.12). */
export const SMART_SCALES = [
  { id: 'withings', emoji: '⚖️' },
  { id: 'garmin_index', emoji: '🟣' },
  { id: 'eufy', emoji: '📊' },
  { id: 'xiaomi', emoji: '🔵' },
  { id: 'renpho', emoji: '📡' },
  { id: 'fitbit_aria', emoji: '🔴' },
] as const;

export const WEARABLES = [
  { id: 'apple_watch', emoji: '⌚' },
  { id: 'fitbit', emoji: '🟠' },
  { id: 'garmin', emoji: '🟣' },
  { id: 'whoop', emoji: '⚫' },
  { id: 'oura', emoji: '💍' },
  { id: 'polar', emoji: '🔴' },
  { id: 'galaxy_watch', emoji: '🟦' },
  { id: 'amazfit', emoji: '🟢' },
  { id: 'samsung_health', emoji: '📱' },
] as const;

/** Steps in order. goalWeight and pace appear only when Lose Fat is selected (prototype buildSteps). */
export type StepId =
  | 'personal'
  | 'consent'
  | 'measurements'
  | 'goal'
  | 'goalWeight'
  | 'pace'
  | 'goalDate'
  | 'motivation'
  | 'activity'
  | 'trainingFreq'
  | 'dietStyle'
  | 'restrictions'
  | 'avoidFoods'
  | 'allergies'
  | 'healthApps'
  | 'devices'
  | 'aiPlan';

export function buildSteps(goals: readonly GoalType[]): StepId[] {
  return [
    'personal',
    'consent',
    'measurements',
    'goal',
    ...(goals.includes('lose_fat') ? (['goalWeight', 'pace'] as const) : []),
    'goalDate',
    'motivation',
    'activity',
    'trainingFreq',
    'dietStyle',
    'restrictions',
    'avoidFoods',
    'allergies',
    'healthApps',
    'devices',
    'aiPlan',
  ];
}

/** Steps with a "Skip for now" link (prototype). */
export const SKIPPABLE_STEPS: readonly StepId[] = [
  'motivation',
  'avoidFoods',
  'allergies',
  'healthApps',
  'devices',
];
