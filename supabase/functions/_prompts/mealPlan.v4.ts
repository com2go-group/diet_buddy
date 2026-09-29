/**
 * Meal plan prompt, version 4 (v3 + the user's cooking time, budget, cuisines and "cook once,
 * eat twice" leftovers, and single-ingredient swaps). Each meal is one complete dish (a title, a one-line summary, its
 * ingredients, and short recipe steps with a preparation time). The model only chooses dishes, ingredients and portions; every
 * calorie and macro number is looked up in USDA FoodData Central afterwards (CLAUDE.md §9), and
 * dish names and ingredients are checked against the user's allergies and restrictions in code
 * (dietRules.ts).
 */

export const MEAL_PLAN_PROMPT_VERSION = 'mealPlan.v4';

type Slot = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export interface MealPlanPromptInput {
  targets: { calories: number; proteinG: number };
  slotCalories: Record<Slot, number>;
  dietStyles: string[];
  restrictions: string[];
  allergies: string[];
  avoid: string[];
  /**
   * Shorter dishes for free users (cost: output tokens are most of a plan's price): a brief
   * description, 2–4 ingredients and at most 3 steps. Same rules and checks otherwise.
   */
  concise?: boolean;
  /** quick: ≤ 15 min per meal, medium: ≤ 30 min, any: no limit. */
  cookingTime?: 'quick' | 'medium' | 'any';
  /** low: affordable staples; medium: everyday; any: no preference. */
  budget?: 'low' | 'medium' | 'any';
  cuisines?: string[];
  /** Dinner makes an extra portion that becomes the next day's lunch. */
  cookForLeftovers?: boolean;
  /** Today's lunch is already planned: leftovers of yesterday's dinner (its title). */
  leftoverLunch?: string;
}

const TIME_LINE = {
  quick: 'Cooking time: every meal must take 15 minutes or less (prep_minutes ≤ 15).',
  medium: 'Cooking time: every meal must take 30 minutes or less (prep_minutes ≤ 30).',
  any: '',
} as const;
const BUDGET_LINE = {
  low: 'Budget: low. Prefer affordable staples (eggs, legumes, oats, rice, pasta, potatoes, frozen or seasonal vegetables, chicken thighs, canned fish, yogurt); avoid pricey items (salmon fillets, steak, prawns, lots of nuts, out-of-season berries).',
  medium: 'Budget: everyday. Mostly affordable ingredients; an occasional pricier item is fine.',
  any: '',
} as const;

/** The user's cooking preferences as prompt lines (empty when there are none). */
function cookingLines(input: MealPlanPromptInput): string {
  const lines = [
    TIME_LINE[input.cookingTime ?? 'any'],
    BUDGET_LINE[input.budget ?? 'any'],
    input.cuisines?.length
      ? `Cuisines the user enjoys (use them often, not every meal): ${input.cuisines.map((c) => c.replace(/_/g, ' ')).join(', ')}.`
      : '',
  ].filter(Boolean);
  return lines.length ? `\nPreferences (follow when possible):\n- ${lines.join('\n- ')}` : '';
}

/** Placeholder the model returns for a lunch that is already planned (leftovers). */
export const LEFTOVER_PLACEHOLDER = {
  title: 'Leftovers',
  description: '',
  ingredients: [{ name: 'water', usda_query: 'water', grams: 1 }],
  steps: [],
};

const CONCISE = `
Keep it brief: a description of under 12 words, 2–4 ingredients per meal (1–3 for a snack), and at most 3 steps of under 15 words each.`;

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
- The description is one short sentence summing up the dish (no health claims).
- Steps: 2–6 short, clear recipe steps (a simple snack may have 1). Refer to ingredients by name only, never with amounts or grams (portions are shown separately and may change), and never mention calories. Only use ingredients from the list, plus water, salt, pepper, herbs and spices.
- prep_minutes: realistic total time in minutes.
- List 2–6 ingredients per meal (2–4 for a snack), each a single plain food with a short USDA search query (e.g. "oats rolled dry", "chicken breast roasted", "spinach cooked") and a portion in grams. Include oils or sauces that matter for calories.
- Do not state calories or macros; they are looked up separately.
- Balanced meals: a protein source, vegetables or fruit, and a sensible carbohydrate where the diet allows. No supplements, no alcohol.
- When unsure whether a food fits the requirements, choose something else.`;

const MEAL_JSON = `{"title":"...","description":"...","ingredients":[{"name":"...","usda_query":"...","grams":80}],"steps":["...","..."],"prep_minutes":15}`;

export function mealPlanSystemPrompt(input: MealPlanPromptInput): string {
  return `You are DietBuddy's meal planner. Plan one day of simple, realistic meals.

${requirements(input)}${cookingLines(input)}

Targets for the day: about ${input.targets.calories} kcal and at least ${input.targets.proteinG} g protein.
Approximate calories per meal: breakfast ${input.slotCalories.breakfast}, lunch ${input.slotCalories.lunch}, snack ${input.slotCalories.snack}, dinner ${input.slotCalories.dinner}.

${MEAL_RULES}
- Use different main ingredients across the day's meals.${
    input.cookForLeftovers
      ? "\n- Dinner: choose a dish that keeps well in the fridge; the portion listed is for tonight, and the last step says to cook and set aside one more portion for tomorrow's lunch."
      : ''
  }${
    input.leftoverLunch
      ? `\n- Lunch is already planned (leftovers of yesterday's dinner, "${input.leftoverLunch}"): for lunch return exactly ${JSON.stringify(LEFTOVER_PLACEHOLDER)} and plan the other meals around it (avoid the same main ingredient).`
      : ''
  }${input.concise ? CONCISE : ''}

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

${requirements(input)}${cookingLines(input)}

Aim for about ${input.slotCalories[slot]} kcal for this ${slot}; the day's protein target is ${input.targets.proteinG} g.
It must be clearly different from these, which the user didn't want: ${list(avoidTitles)}.

${MEAL_RULES}${input.concise ? CONCISE : ''}

Reply with JSON only:
{"meal":${MEAL_JSON}}`;
}

/**
 * One replacement ingredient for a planned dish ("Swap"): the model names a food that plays the
 * same role; grams and numbers are worked out in code from USDA.
 */
export function swapIngredientSystemPrompt(
  input: MealPlanPromptInput,
  dishTitle: string,
  ingredients: string[],
  swapOut: string,
): string {
  return `You are DietBuddy's meal planner. The user wants to replace one ingredient in a dish.

${requirements(input)}${cookingLines(input)}

Dish: "${dishTitle}". Ingredients: ${list(ingredients)}.
Replace: "${swapOut}". Choose one plain food that plays the same role in this dish (e.g. a protein for a protein), fits every requirement, and is not already in the dish.

Reply with JSON only:
{"name":"...","usda_query":"..."}`;
}

export function retryFeedback(problems: string[]): string {
  return `That can't be used: ${problems.join('; ')}. Replace those with different foods that meet every requirement, and reply with the full JSON again.`;
}
