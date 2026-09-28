/**
 * Meal plan prompt, version 2: each meal is one complete dish (a title, a line on how to put it
 * together and its ingredients). The model only chooses dishes, ingredients and portions; every
 * calorie and macro number is looked up in USDA FoodData Central afterwards (CLAUDE.md §9), and
 * dish names and ingredients are checked against the user's allergies and restrictions in code
 * (dietRules.ts).
 */

export const MEAL_PLAN_PROMPT_VERSION = 'mealPlan.v2';

type Slot = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export interface MealPlanPromptInput {
  targets: { calories: number; proteinG: number };
  slotCalories: Record<Slot, number>;
  dietStyles: string[];
  restrictions: string[];
  allergies: string[];
  avoid: string[];
}

const list = (items: string[]) => (items.length ? items.join(', ') : 'none');

function requirements(input: MealPlanPromptInput): string {
  return `User requirements (never break these):
- Diet style: ${list(input.dietStyles)}
- Restrictions: ${list(input.restrictions)}
- ALLERGIES — never include these or anything containing them: ${list(input.allergies)}
- Foods to avoid: ${list(input.avoid)}`;
}

const MEAL_RULES = `Rules:
- Each meal is one complete, appetising dish or plate that people really eat, with a clear title, e.g. "Greek yogurt bowl with berries and oats", "Chicken, rice and roasted vegetables", "Lentil and spinach curry with brown rice". A snack can be simple, e.g. "Apple with cottage cheese".
- The description is one short sentence on how to put it together (no full recipe, no health claims).
- List 2–6 ingredients per meal (2–4 for a snack), each a single plain food with a short USDA search query (e.g. "oats rolled dry", "chicken breast roasted", "spinach cooked") and a portion in grams. Include oils or sauces that matter for calories.
- Do not state calories or macros; they are looked up separately.
- Balanced meals: a protein source, vegetables or fruit, and a sensible carbohydrate where the diet allows. No supplements, no alcohol.
- When unsure whether a food fits the requirements, choose something else.`;

const MEAL_JSON = `{"title":"...","description":"...","ingredients":[{"name":"...","usda_query":"...","grams":80}]}`;

export function mealPlanSystemPrompt(input: MealPlanPromptInput): string {
  return `You are DietBuddy's meal planner. Plan one day of simple, realistic meals.

${requirements(input)}

Targets for the day: about ${input.targets.calories} kcal and at least ${input.targets.proteinG} g protein.
Approximate calories per meal: breakfast ${input.slotCalories.breakfast}, lunch ${input.slotCalories.lunch}, snack ${input.slotCalories.snack}, dinner ${input.slotCalories.dinner}.

${MEAL_RULES}
- Use different main ingredients across the day's meals.

Reply with JSON only:
{"meals":{"breakfast":${MEAL_JSON},"lunch":{...},"snack":{...},"dinner":{...}}}`;
}

/** One replacement meal for "Another idea", different from what was already suggested. */
export function alternativeMealSystemPrompt(
  input: MealPlanPromptInput,
  slot: Slot,
  avoidTitles: string[],
): string {
  return `You are DietBuddy's meal planner. Suggest one ${slot} for today.

${requirements(input)}

Aim for about ${input.slotCalories[slot]} kcal for this ${slot}; the day's protein target is ${input.targets.proteinG} g.
It must be clearly different from these, which the user didn't want: ${list(avoidTitles)}.

${MEAL_RULES}

Reply with JSON only:
{"meal":${MEAL_JSON}}`;
}

export function retryFeedback(problems: string[]): string {
  return `That can't be used: ${problems.join('; ')}. Replace those with different foods that meet every requirement, and reply with the full JSON again.`;
}
