/**
 * The compact, de-identified summary the coach receives (CLAUDE.md §7.7, §11): no name, email,
 * birth date or photos — age in years only.
 */

export interface CoachProfile {
  birthDate: string | null;
  gender: string | null;
  heightCm: number | null;
  units: 'metric' | 'imperial';
  streakDays: number;
}

export interface CoachContextData {
  profile: CoachProfile;
  goal: { types: string[]; goalWeightKg: number | null; pace: string | null } | null;
  preferences: {
    activityLevel: string | null;
    trainingFrequency: string | null;
    dietStyles: string[];
    restrictions: string[];
    restrictionOther: string | null;
    avoidFoods: string[];
    allergies: string[];
    allergyOther: string | null;
  } | null;
  plan: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    waterMl: number;
  } | null;
  latestWeightKg: number | null;
  today: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    waterMl: number;
    meals: string[];
  };
  last7DaysAvgCalories: number | null;
  latestCheckIn: { date: string; mood: string; energy: number; sleepHours: number | null } | null;
}

export function ageOn(birthDate: string, now: Date): number {
  const [y, m, d] = birthDate.split('-').map(Number) as [number, number, number];
  let age = now.getUTCFullYear() - y;
  if (now.getUTCMonth() + 1 < m || (now.getUTCMonth() + 1 === m && now.getUTCDate() < d)) age -= 1;
  return age;
}

const list = (items: string[], other?: string | null) =>
  [...items.filter((i) => i !== 'other'), ...(other ? [other] : [])].join(', ') || 'none';

/** `now` is the user's local wall-clock time (see localNow in handler.ts). */
export function buildCoachContext(data: CoachContextData, now: Date): string {
  const { profile, goal, preferences: p, plan, today } = data;
  const lines = [
    `Units: ${profile.units}`,
    [
      profile.birthDate ? `age ${ageOn(profile.birthDate, now)}` : null,
      profile.gender && profile.gender !== 'unspecified' ? profile.gender : null,
      profile.heightCm ? `height ${profile.heightCm} cm` : null,
      data.latestWeightKg ? `weight ${data.latestWeightKg} kg` : null,
    ]
      .filter(Boolean)
      .join(', '),
    goal
      ? `Goals: ${goal.types.join(', ')}${goal.goalWeightKg ? `; goal weight ${goal.goalWeightKg} kg` : ''}${goal.pace ? `; pace ${goal.pace}` : ''}`
      : 'Goals: not set',
    plan
      ? `Daily targets: ${plan.calories} kcal (never go below this), protein ${plan.proteinG} g, carbs ${plan.carbsG} g, fat ${plan.fatG} g, water ${plan.waterMl} ml`
      : 'Daily targets: not set',
    p
      ? `Activity: ${p.activityLevel ?? 'unknown'}; training ${p.trainingFrequency ?? 'unknown'} days/week`
      : null,
    p ? `Diet style: ${list(p.dietStyles)}` : null,
    p ? `Restrictions: ${list(p.restrictions, p.restrictionOther)}` : null,
    p ? `ALLERGIES (never suggest): ${list(p.allergies, p.allergyOther)}` : null,
    p ? `Foods to avoid: ${list(p.avoidFoods)}` : null,
    `Today so far: ${Math.round(today.calories)} kcal, protein ${Math.round(today.proteinG)} g, carbs ${Math.round(today.carbsG)} g, fat ${Math.round(today.fatG)} g, water ${today.waterMl} ml` +
      (today.meals.length
        ? `; logged: ${today.meals.slice(0, 12).join(', ')}`
        : '; nothing logged yet'),
    data.last7DaysAvgCalories ? `Last 7 days average: ${data.last7DaysAvgCalories} kcal/day` : null,
    `Streak: ${profile.streakDays} days`,
    data.latestCheckIn
      ? `Latest check-in (${data.latestCheckIn.date}): mood ${data.latestCheckIn.mood}, energy ${data.latestCheckIn.energy}/10${data.latestCheckIn.sleepHours !== null ? `, sleep ${data.latestCheckIn.sleepHours} h` : ''}`
      : null,
    `User's local time: ${now.toISOString().slice(0, 16).replace('T', ' ')}`,
  ];
  return lines
    .filter((l): l is string => Boolean(l))
    .map((l) => `- ${l}`)
    .join('\n');
}
