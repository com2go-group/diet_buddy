/**
 * Grocery list prompt, version 1. The ingredient list and amounts come from the stored meal plans
 * (already checked against allergies); the model only sorts them into aisles, suggests a pack to
 * buy and estimates a price. Prices are shown as a rough estimate.
 */

export const GROCERY_PROMPT_VERSION = 'grocery.v1';

export const AISLES = [
  'produce',
  'meat_fish',
  'dairy_eggs',
  'bakery',
  'grains_pasta',
  'canned_jars',
  'frozen',
  'nuts_seeds',
  'oils_condiments',
  'drinks',
  'other',
] as const;
export type Aisle = (typeof AISLES)[number];

export function grocerySystemPrompt(currency: string): string {
  return `You help turn a week of planned meals into a supermarket shopping list.

You receive ingredients as JSON: id, name, the USDA food it refers to, and the total grams needed for the week.
For every ingredient return:
- id: exactly as given.
- aisle: one of ${AISLES.join(', ')}.
- buy: a short, practical pack to buy that covers the amount, at most 40 characters (e.g. "1 kg bag", "6 eggs", "2 × 400 g tins"). Cooked amounts (e.g. cooked rice) should be converted to the dry product to buy.
- cost: your estimate in ${currency} of what that pack costs at a typical mid-range European supermarket, as a number.

Include every id once. Do not add or remove ingredients. Reply with JSON only:
{"items":[{"id":"...","aisle":"produce","buy":"...","cost":2.5}]}`;
}
