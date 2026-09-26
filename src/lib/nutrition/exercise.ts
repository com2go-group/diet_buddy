import type { GoalType } from './types';

export type TrainingFrequency = '0_1' | '2_3' | '4_5' | '6_plus';
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type SessionType = 'strength' | 'cardio' | 'intervals' | 'active_rest' | 'rest';

export interface ExerciseSession {
  days: Weekday[];
  type: SessionType;
  minutes: number;
  /** Estimated kcal per session for this body weight (MET × kg × hours), rounded to 10. */
  kcal: number;
}

/** Metabolic equivalents (Compendium of Physical Activities, typical values). */
const MET: Record<SessionType, number> = {
  strength: 5,
  cardio: 4.3, // brisk walk / easy cycling
  intervals: 8,
  active_rest: 2.5, // yoga / stretching
  rest: 0,
};

type Template = { days: Weekday[]; type: SessionType; minutes: number }[];

/**
 * Weekly templates by current training frequency: a realistic step up from what the user does
 * now rather than a jump to an athlete's schedule.
 */
const TEMPLATES: Record<TrainingFrequency, Template> = {
  '0_1': [
    { days: ['mon', 'thu'], type: 'strength', minutes: 30 },
    { days: ['tue', 'sat'], type: 'cardio', minutes: 30 },
    { days: ['wed', 'fri', 'sun'], type: 'rest', minutes: 0 },
  ],
  '2_3': [
    { days: ['mon', 'wed', 'fri'], type: 'strength', minutes: 45 },
    { days: ['tue', 'thu'], type: 'cardio', minutes: 30 },
    { days: ['sat'], type: 'active_rest', minutes: 30 },
    { days: ['sun'], type: 'rest', minutes: 0 },
  ],
  '4_5': [
    { days: ['mon', 'tue', 'thu', 'fri'], type: 'strength', minutes: 50 },
    { days: ['wed', 'sat'], type: 'cardio', minutes: 30 },
    { days: ['sun'], type: 'rest', minutes: 0 },
  ],
  '6_plus': [
    { days: ['mon', 'tue', 'thu', 'fri'], type: 'strength', minutes: 60 },
    { days: ['wed', 'sat'], type: 'cardio', minutes: 40 },
    { days: ['sun'], type: 'active_rest', minutes: 30 },
  ],
};

/**
 * Rule-based weekly exercise recommendation for the initial plan (CLAUDE.md §7.4).
 * Fat loss adds 10 minutes to cardio sessions; performance goals turn the first cardio session
 * into intervals. Calorie burn is an estimate for display only; it is never added to food targets.
 */
export function exerciseRecommendation(
  frequency: TrainingFrequency,
  goals: readonly GoalType[],
  weightKg: number,
): ExerciseSession[] {
  let intervalsAssigned = false;
  return TEMPLATES[frequency].map((session) => {
    let { type, minutes } = session;
    if (type === 'cardio' && goals.includes('lose_fat')) minutes += 10;
    if (type === 'cardio' && goals.includes('improve_performance') && !intervalsAssigned) {
      type = 'intervals';
      minutes = Math.min(minutes, 30);
      intervalsAssigned = true;
    }
    const kcal = Math.round((MET[type] * weightKg * (minutes / 60)) / 10) * 10;
    return { days: session.days, type, minutes, kcal };
  });
}
