import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

import type { FoodResult } from './usda.ts';

/** How long a USDA search result is reused. Generic foods rarely change. */
export const USDA_CACHE_DAYS = 30;

/**
 * Wraps a USDA search with the shared `usda_food_cache` table (service role), so meal plans,
 * above all the nightly batch, stay within USDA's hourly request limit. Queries are the model's
 * generic ingredient searches ("oats rolled dry"), never user data. A cache failure falls back
 * to USDA; an empty USDA answer is not cached.
 */
export function cachedSearch(
  db: SupabaseClient,
  search: (query: string) => Promise<FoodResult[]>,
): (query: string) => Promise<FoodResult[]> {
  return async (raw) => {
    const query = raw.trim().toLowerCase().slice(0, 100);
    const since = new Date(Date.now() - USDA_CACHE_DAYS * 86_400_000).toISOString();
    const { data } = await db
      .from('usda_food_cache')
      .select('foods')
      .eq('query', query)
      .gte('fetched_at', since)
      .maybeSingle();
    const hit = (data as { foods: FoodResult[] } | null)?.foods;
    if (Array.isArray(hit)) return hit;
    const foods = await search(query);
    if (foods.length) {
      await db
        .from('usda_food_cache')
        .upsert({ query, foods, fetched_at: new Date().toISOString() })
        .then(
          () => undefined,
          () => undefined,
        );
    }
    return foods;
  };
}
