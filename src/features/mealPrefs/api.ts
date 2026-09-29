import { optional, supabase } from '@/lib/supabase';

export const COOKING_TIMES = ['quick', 'medium', 'any'] as const;
export const BUDGETS = ['low', 'medium', 'any'] as const;
export const CUISINES = [
  'mediterranean',
  'italian',
  'greek',
  'spanish',
  'french',
  'german',
  'middle_eastern',
  'indian',
  'asian',
  'mexican',
  'american',
] as const;

export interface MealPrefs {
  cooking_time: (typeof COOKING_TIMES)[number];
  food_budget: (typeof BUDGETS)[number];
  cuisines: string[];
  leftovers: boolean;
}

export const DEFAULT_MEAL_PREFS: MealPrefs = {
  cooking_time: 'any',
  food_budget: 'any',
  cuisines: [],
  leftovers: false,
};

export async function loadMealPrefs(userId: string): Promise<MealPrefs> {
  const rows = optional(
    await supabase
      .from('preferences')
      .select('cooking_time, food_budget, cuisines, leftovers')
      .eq('user_id', userId)
      .limit(1),
  );
  const r = rows?.[0];
  if (!r) return DEFAULT_MEAL_PREFS;
  return {
    cooking_time: (COOKING_TIMES as readonly string[]).includes(r.cooking_time)
      ? (r.cooking_time as MealPrefs['cooking_time'])
      : 'any',
    food_budget: (BUDGETS as readonly string[]).includes(r.food_budget)
      ? (r.food_budget as MealPrefs['food_budget'])
      : 'any',
    cuisines: r.cuisines ?? [],
    leftovers: r.leftovers,
  };
}

/** Saved on the user's preferences row; the next meal plan follows them. */
export async function saveMealPrefs(userId: string, prefs: MealPrefs): Promise<void> {
  optional(await supabase.from('preferences').update(prefs).eq('user_id', userId));
}
