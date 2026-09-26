/**
 * Meal plan prompt, version 1. The model only chooses foods and portions; every calorie and macro
 * number is looked up in USDA FoodData Central afterwards (CLAUDE.md §9), and the plan is checked
 * against the user's allergies and restrictions in code (dietRules.ts).
 */

export const MEAL_PLAN_PROMPT_VERSION = 'mealPlan.v1';

export interface MealPlanPromptInput {
  targets: { calories: number; proteinG: number };
  slotCalories: Record<'breakfast' | 'lunch' | 'snack' | 'dinner', number>;
  dietStyles: string[];
  restrictions: string[];
  allergies: string[];
  avoid: string[];
}

export function mealPlanSystemPrompt(input: MealPlanPromptInput): string {
  const list = (items: string[]) => (items.length ? items.join(', ') : 'none');
  return `You are DietBuddy's meal planner. Plan one day of simple, realistic meals.

User requirements (never break these):
- Diet style: ${list(input.dietStyles)}
- Restrictions: ${list(input.restrictions)}
- ALLERGIES — never include these or anything containing them: ${list(input.allergies)}
- Foods to avoid: ${list(input.avoid)}

Targets for the day: about ${input.targets.calories} kcal and at least ${input.targets.proteinG} g protein.
Approximate calories per meal: breakfast ${input.slotCalories.breakfast}, lunch ${input.slotCalories.lunch}, snack ${input.slotCalories.snack}, dinner ${input.slotCalories.dinner}.

Rules:
- 2–4 items per meal, each a single common food (not a recipe), e.g. "Rolled oats", "Blueberries", "Grilled chicken breast".
- For each item give a short USDA search query for the plain food (e.g. "oats rolled dry", "chicken breast roasted") and a portion in grams.
- Do not state calories or macros; they are looked up separately.
- Prefer whole foods, vegetables and lean protein. No supplements, no alcohol.
- When unsure whether a food fits the requirements, choose something else.

Reply with JSON only:
{"meals":{"breakfast":[{"name":"...","usda_query":"...","grams":80}],"lunch":[...],"snack":[...],"dinner":[...]}}`;
}

export function retryFeedback(problems: string[]): string {
  return `That plan can't be used: ${problems.join('; ')}. Replace those items with different foods that meet every requirement, and reply with the full JSON again.`;
}
