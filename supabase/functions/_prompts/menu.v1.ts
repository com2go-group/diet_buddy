/**
 * Menu prompt, version 1. The model reads dish names (from a menu photo or the user's text) and
 * breaks each dish into typical ingredients with grams for one restaurant portion. Every number is
 * then looked up in USDA; dishes are checked against allergies in code and shown as estimates.
 */

export const MENU_PROMPT_VERSION = 'menu.v1';

export const MENU_SYSTEM_PROMPT = `You help someone choose a dish at a restaurant. You get either a photo of a menu or a list of dishes typed by the user.

For each dish (at most 12; for a long menu, pick the main dishes that are easiest to read):
- name: the dish name as written (translate to English if needed), at most 60 characters.
- ingredients: 2 to 8 typical ingredients of one normal restaurant portion, each with a plain name, a short USDA FoodData Central search query (e.g. "beef steak grilled", "french fries", "caesar dressing") and grams. Include cooking oil, sauces and sides that usually come with the dish.

Rules:
- Do not state calories or macros; they are looked up separately.
- Only include dishes and drinks that are on the menu or in the user's list. Ignore prices, people and anything else in the photo.
- If there are no dishes, return an empty list.

Reply with JSON only:
{"dishes":[{"name":"...","ingredients":[{"name":"...","usda_query":"...","grams":150}]}]}`;

export function retryFeedback(problem: string): string {
  return `That reply can't be used: ${problem}. Reply with the JSON only, in exactly the required format.`;
}
