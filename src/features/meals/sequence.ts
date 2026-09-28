import type { MealPlan, PlannedItem } from './mealPlanApi';
import { MEAL_SLOTS } from './portion';
import type { FoodLog, MealSlot } from './types';

/**
 * Today's plan is followed meal by meal (owner decision 2026-09-28): a meal's suggestion appears
 * only once the one before it has been logged from the plan ("I ate this"). Food logged another
 * way still counts towards the day, and the next meal's portions adapt to it.
 */
export type SlotState = 'done' | 'current' | 'locked';

type Log = Pick<FoodLog, 'meal_slot' | 'source' | 'calories'>;

/**
 * A meal is done once something from the plan was logged for it ("I ate this"). Any plan log
 * counts, so a Premium "New plan" later in the day doesn't undo meals already eaten.
 */
export function slotDone(plan: MealPlan, logs: Log[], slot: MealSlot): boolean {
  if (!(plan.slots[slot] ?? []).length) return true;
  return logs.some((l) => l.source === 'plan' && l.meal_slot === slot);
}

/** The first meal that hasn't been logged yet, or null when the whole day is done. */
export function currentSlot(plan: MealPlan, logs: Log[]): MealSlot | null {
  return MEAL_SLOTS.find((s) => !slotDone(plan, logs, s)) ?? null;
}

export function slotStates(plan: MealPlan, logs: Log[]): Record<MealSlot, SlotState> {
  const current = currentSlot(plan, logs);
  const currentIndex = current ? MEAL_SLOTS.indexOf(current) : MEAL_SLOTS.length;
  return Object.fromEntries(
    MEAL_SLOTS.map((s, i) => [
      s,
      i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'locked',
    ]),
  ) as Record<MealSlot, SlotState>;
}

/** The meal before this one (for "Log your breakfast to see your lunch"). */
export const previousSlot = (slot: MealSlot): MealSlot | null =>
  MEAL_SLOTS[MEAL_SLOTS.indexOf(slot) - 1] ?? null;

/** Same bounds as the server's portion scaling (generate-meal-plan), so a meal stays a meal. */
export const MIN_FACTOR = 0.6;
export const MAX_FACTOR = 1.6;

/**
 * Portion factor for the meals still to come: what is left of today's calorie target (the
 * target already respects the safety floors, CLAUDE.md §9) over what the remaining meals were
 * planned to provide. Everything eaten today counts, whichever way it was logged.
 */
export function adaptFactor(plan: MealPlan, logs: Log[], dailyTargetKcal: number | null): number {
  if (!dailyTargetKcal) return 1;
  const remainingSlots = MEAL_SLOTS.filter((s) => !slotDone(plan, logs, s));
  const planned = remainingSlots.reduce(
    (sum, s) => sum + (plan.slots[s] ?? []).reduce((t, i) => t + i.kcal, 0),
    0,
  );
  if (planned <= 0) return 1;
  const eaten = logs.reduce((t, l) => t + l.calories, 0);
  const left = Math.max(0, dailyTargetKcal - eaten);
  const factor = Math.min(MAX_FACTOR, Math.max(MIN_FACTOR, left / planned));
  return Math.round(factor * 100) / 100;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Scales a planned item's grams (to the nearest 5 g) and its USDA numbers in proportion, so the
 * numbers still come from the database, never from the model (CLAUDE.md §9).
 */
export function adaptItem(item: PlannedItem, factor: number): PlannedItem {
  if (factor === 1) return item;
  const grams = Math.max(5, Math.round((item.grams * factor) / 5) * 5);
  const ratio = grams / item.grams;
  return {
    ...item,
    grams,
    kcal: Math.round(item.kcal * ratio),
    proteinG: round1(item.proteinG * ratio),
    carbsG: round1(item.carbsG * ratio),
    fatG: round1(item.fatG * ratio),
  };
}

/** Only a noticeable change is shown as an adjustment. */
export const isAdjusted = (factor: number) => Math.abs(factor - 1) >= 0.05;
