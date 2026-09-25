import { bmi, bmiCategory, weightForBmi } from './bmi';
import { roundToTotal } from './bodyComposition';
import {
  ACTIVITY_MULTIPLIERS,
  BMI_OVERWEIGHT,
  BMI_UNDERWEIGHT,
  BUILD_MUSCLE_SURPLUS_KCAL,
  CALORIE_FLOOR,
  FAT_CALORIE_FRACTION,
  FIBER_G_PER_1000_KCAL,
  KCAL_PER_GRAM,
  PROTEIN_G_PER_KG,
  PROTEIN_HIGH_BMI_THRESHOLD,
  RECOMP_DEFICIT_BMI_THRESHOLD,
  RECOMP_DEFICIT_KCAL,
  WATER_ACTIVE_BONUS_ML,
  WATER_MAX_ML,
  WATER_MIN_ML,
  WATER_ML_PER_KG,
} from './constants';
import { bmr as calcBmr } from './energy';
import {
  addWeeks,
  dailyDeficitForWeeklyKg,
  maxWeeklyLossKg,
  requestedWeeklyKg,
  weeklyKgForDailyDeficit,
  weeksToGoal,
} from './pace';
import type { ActivityLevel, Body, GoalType, Pace, Sex } from './types';
import { assertValidBody } from './validation';

export type PlanStrategy = 'lose' | 'recomp' | 'gain' | 'maintain';

export type PlanWarningCode =
  /** Current BMI < 18.5: suggest talking to a professional. */
  | 'underweight_current'
  /** Fast pace chosen: always shows a caution. */
  | 'fast_pace'
  /** The chosen pace exceeded 1 % of body weight per week and was reduced. */
  | 'weekly_loss_capped'
  /** The calorie target was raised to the floor, so the loss rate is slower than chosen. */
  | 'calorie_floor_applied'
  /** TDEE is at or below the floor, so no deficit is possible. */
  | 'no_safe_deficit';

export interface PlanWarning {
  code: PlanWarningCode;
  severity: 'info' | 'caution';
}

export type GoalWeightIssue = 'goal_not_below_current' | 'goal_bmi_too_low';

export interface PlanInput {
  body: Body;
  activity: ActivityLevel;
  goals: readonly GoalType[];
  /** Required when goals include 'lose_fat'. */
  goalWeightKg?: number;
  /** Required when goals include 'lose_fat'. */
  pace?: Pace;
  /** Values the user edited on the body-scan screen override calculated ones. */
  overrides?: { bmr?: number; tdee?: number };
  /** Start of the plan, for the estimated goal date. Defaults to now. */
  startDate?: Date;
}

export interface MacroTargets {
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  /** Share of calories per macro, computed from the gram targets; sums to 100. */
  pct: { protein: number; carbs: number; fat: number };
}

export interface Plan {
  strategy: PlanStrategy;
  bmr: number;
  tdee: number;
  bmi: number;
  calorieFloor: number;
  dailyCalories: number;
  /** dailyCalories − TDEE. Negative is a deficit. */
  dailyCalorieDelta: number;
  /** Expected weekly weight change in kg. Negative is loss. */
  weeklyChangeKg: number;
  macros: MacroTargets;
  waterMl: number;
  timeline: { kgToLose: number; weeks: number; goalDate: Date } | null;
  warnings: PlanWarning[];
}

export class PlanInputError extends Error {
  constructor(public readonly issue: GoalWeightIssue | 'missing_goal_weight' | 'missing_pace') {
    super(`Invalid plan input: ${issue}`);
    this.name = 'PlanInputError';
  }
}

/** Blocks weight-loss goals below BMI 18.5 or not below the current weight (CLAUDE.md §9). */
export function validateGoalWeight(
  currentKg: number,
  goalKg: number,
  heightCm: number,
): GoalWeightIssue | null {
  if (!(goalKg < currentKg)) return 'goal_not_below_current';
  if (bmi(goalKg, heightCm) < BMI_UNDERWEIGHT) return 'goal_bmi_too_low';
  return null;
}

/** Lowest goal weight allowed at this height (BMI 18.5), rounded up to 0.1 kg. */
export function minimumGoalWeightKg(heightCm: number): number {
  return Math.ceil(weightForBmi(BMI_UNDERWEIGHT, heightCm) * 10) / 10;
}

/** max(sex floor, BMR). Never plan below this. */
export function calorieFloor(sex: Sex, bmrKcal: number): number {
  return Math.max(CALORIE_FLOOR[sex], bmrKcal);
}

export function pickStrategy(goals: readonly GoalType[], currentBmi: number): PlanStrategy {
  if (goals.includes('lose_fat')) return 'lose';
  if (goals.includes('body_recomposition')) {
    return currentBmi >= RECOMP_DEFICIT_BMI_THRESHOLD ? 'recomp' : 'maintain';
  }
  if (goals.includes('build_muscle')) return 'gain';
  return 'maintain';
}

/**
 * Body weight protein is based on. At BMI ≥ 30 current weight overstates lean mass, so use the
 * goal weight if there is one, else adjusted body weight: w25 + 0.4 × (current − w25), where w25
 * is the weight at BMI 25.
 */
export function proteinReferenceWeightKg(body: Body, goalWeightKg?: number): number {
  if (bmi(body.weightKg, body.heightCm) < PROTEIN_HIGH_BMI_THRESHOLD) return body.weightKg;
  if (goalWeightKg !== undefined && goalWeightKg < body.weightKg) return goalWeightKg;
  const w25 = weightForBmi(BMI_OVERWEIGHT, body.heightCm);
  return w25 + 0.4 * (body.weightKg - w25);
}

/** Protein by g/kg, fat 30 % of calories, carbs the remainder. Percentages come from the grams. */
export function macroTargets(
  dailyCalories: number,
  proteinRefKg: number,
  goals: readonly GoalType[],
): MacroTargets {
  const gPerKg = goals.includes('build_muscle')
    ? PROTEIN_G_PER_KG.buildMuscle
    : PROTEIN_G_PER_KG.default;
  const proteinG = Math.round(proteinRefKg * gPerKg);
  const fatG = Math.round((dailyCalories * FAT_CALORIE_FRACTION) / KCAL_PER_GRAM.fat);
  const carbKcal = dailyCalories - proteinG * KCAL_PER_GRAM.protein - fatG * KCAL_PER_GRAM.fat;
  const carbsG = Math.max(0, Math.round(carbKcal / KCAL_PER_GRAM.carbs));
  const fiberG = Math.round((dailyCalories / 1000) * FIBER_G_PER_1000_KCAL);
  return { proteinG, carbsG, fatG, fiberG, pct: macroPercentages(proteinG, carbsG, fatG) };
}

export function macroPercentages(
  proteinG: number,
  carbsG: number,
  fatG: number,
): MacroTargets['pct'] {
  const kcal = [
    proteinG * KCAL_PER_GRAM.protein,
    carbsG * KCAL_PER_GRAM.carbs,
    fatG * KCAL_PER_GRAM.fat,
  ];
  const total = kcal.reduce((a, b) => a + b, 0);
  if (total <= 0) return { protein: 0, carbs: 0, fat: 0 };
  const [protein, carbs, fat] = roundToTotal(
    kcal.map((k) => (k / total) * 100),
    100,
  ) as [number, number, number];
  return { protein, carbs, fat };
}

/** 35 ml/kg, +500 ml for active users, clamped to 1.5–4 L and rounded to 100 ml. */
export function dailyWaterMl(weightKg: number, activity: ActivityLevel): number {
  const bonus = activity === 'active' || activity === 'very_active' ? WATER_ACTIVE_BONUS_ML : 0;
  const ml = Math.min(WATER_MAX_ML, Math.max(WATER_MIN_ML, weightKg * WATER_ML_PER_KG + bonus));
  return Math.round(ml / 100) * 100;
}

const roundUpTo10 = (n: number) => Math.ceil(n / 10) * 10;
const roundTo10 = (n: number) => Math.round(n / 10) * 10;

export function computePlan(input: PlanInput): Plan {
  const { body, activity, goals } = input;
  assertValidBody(body);

  const currentBmi = bmi(body.weightKg, body.heightCm);
  const bmrKcal = input.overrides?.bmr ?? calcBmr(body);
  const tdeeKcal = input.overrides?.tdee ?? bmrKcal * ACTIVITY_MULTIPLIERS[activity];
  const floor = calorieFloor(body.sex, bmrKcal);
  const strategy = pickStrategy(goals, currentBmi);
  const warnings: PlanWarning[] = [];

  if (bmiCategory(currentBmi) === 'underweight') {
    warnings.push({ code: 'underweight_current', severity: 'caution' });
  }

  let requestedDelta = 0;
  let goalWeightKg: number | undefined;
  if (strategy === 'lose') {
    if (input.goalWeightKg === undefined) throw new PlanInputError('missing_goal_weight');
    if (input.pace === undefined) throw new PlanInputError('missing_pace');
    const issue = validateGoalWeight(body.weightKg, input.goalWeightKg, body.heightCm);
    if (issue) throw new PlanInputError(issue);
    goalWeightKg = input.goalWeightKg;

    if (input.pace === 'fast') warnings.push({ code: 'fast_pace', severity: 'caution' });
    const requested = requestedWeeklyKg(input.pace, body.weightKg);
    const capped = Math.min(requested, maxWeeklyLossKg(body.weightKg));
    if (capped < requested) warnings.push({ code: 'weekly_loss_capped', severity: 'caution' });
    requestedDelta = -dailyDeficitForWeeklyKg(capped);
  } else if (strategy === 'recomp') {
    requestedDelta = -RECOMP_DEFICIT_KCAL;
  } else if (strategy === 'gain') {
    requestedDelta = BUILD_MUSCLE_SURPLUS_KCAL;
  }

  let dailyCalories = roundTo10(tdeeKcal + requestedDelta);
  const minCalories = roundUpTo10(floor);
  if (dailyCalories < minCalories) {
    dailyCalories = minCalories;
    if (requestedDelta < 0) {
      warnings.push(
        minCalories >= tdeeKcal
          ? { code: 'no_safe_deficit', severity: 'caution' }
          : { code: 'calorie_floor_applied', severity: 'caution' },
      );
    }
  }

  const dailyCalorieDelta = Math.round(dailyCalories - tdeeKcal);
  // A surplus is not all stored as fat, so only deficits are converted to a weight trend.
  const weeklyChangeKg = dailyCalorieDelta < 0 ? -weeklyKgForDailyDeficit(-dailyCalorieDelta) : 0;

  let timeline: Plan['timeline'] = null;
  if (strategy === 'lose' && goalWeightKg !== undefined) {
    const kgToLose = body.weightKg - goalWeightKg;
    const weeks = weeksToGoal(kgToLose, -weeklyChangeKg);
    if (weeks !== null) {
      timeline = { kgToLose, weeks, goalDate: addWeeks(input.startDate ?? new Date(), weeks) };
    }
  }

  return {
    strategy,
    bmr: Math.round(bmrKcal),
    tdee: Math.round(tdeeKcal),
    bmi: currentBmi,
    calorieFloor: Math.round(floor),
    dailyCalories,
    dailyCalorieDelta,
    weeklyChangeKg,
    macros: macroTargets(dailyCalories, proteinReferenceWeightKg(body, goalWeightKg), goals),
    waterMl: dailyWaterMl(body.weightKg, activity),
    timeline,
    warnings,
  };
}

export interface PaceScenario {
  pace: Pace;
  weeklyKg: number;
  dailyCalories: number;
  weeks: number | null;
  warnings: PlanWarningCode[];
}

/** All three paces side by side for the onboarding timeline chart, with the same safety caps. */
export function comparePaces(input: Omit<PlanInput, 'pace'>): PaceScenario[] {
  return (['sustainable', 'balanced', 'fast'] as const).map((pace) => {
    const plan = computePlan({ ...input, pace });
    return {
      pace,
      weeklyKg: -plan.weeklyChangeKg,
      dailyCalories: plan.dailyCalories,
      weeks: plan.timeline?.weeks ?? null,
      warnings: plan.warnings.map((w) => w.code),
    };
  });
}
