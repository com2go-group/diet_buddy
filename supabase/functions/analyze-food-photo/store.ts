import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

import type { DietPrefs } from '../_shared/dietRules.ts';
import { DEFAULT_DAILY_LIMIT, type FoodPhotoStore } from './handler.ts';

const FUNCTION_NAME = 'analyze-food-photo';

function must<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

export function supabaseFoodPhotoStore(db: SupabaseClient): FoodPhotoStore {
  return {
    async isPremium(userId) {
      const row = must(
        await db.from('profiles').select('is_premium').eq('user_id', userId).single(),
      );
      return Boolean((row as { is_premium: boolean }).is_premium);
    },

    async prefs(userId): Promise<DietPrefs> {
      const rows = must(
        await db
          .from('preferences')
          .select(
            'diet_styles, restrictions, restriction_other, allergies, allergy_other, avoid_foods',
          )
          .eq('user_id', userId)
          .limit(1),
      ) as
        | {
            diet_styles: string[];
            restrictions: string[];
            restriction_other: string | null;
            allergies: string[];
            allergy_other: string | null;
            avoid_foods: string[];
          }[]
        | null;
      const p = rows?.[0];
      return {
        dietStyles: p?.diet_styles ?? [],
        restrictions: p?.restrictions ?? [],
        restrictionOther: p?.restriction_other ?? null,
        allergies: p?.allergies ?? [],
        allergyOther: p?.allergy_other ?? null,
        avoidFoods: p?.avoid_foods ?? [],
      };
    },

    async dailyLimit() {
      const { data } = await db
        .from('app_config')
        .select('value')
        .eq('key', 'food_photo_daily_limit_free')
        .maybeSingle();
      const value = Number((data as { value: unknown } | null)?.value);
      return Number.isFinite(value) && value >= 0 ? value : DEFAULT_DAILY_LIMIT;
    },

    async scansSince(userId, since) {
      const rows = must(
        await db
          .from('ai_usage')
          .select('id')
          .eq('user_id', userId)
          .eq('function_name', FUNCTION_NAME)
          .gte('created_at', since.toISOString())
          .limit(1000),
      ) as unknown[] | null;
      return rows?.length ?? 0;
    },

    async logUsage(userId, model, inputTokens, outputTokens) {
      must(
        await db.from('ai_usage').insert({
          user_id: userId,
          function_name: FUNCTION_NAME,
          model,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
        }),
      );
    },
  };
}
