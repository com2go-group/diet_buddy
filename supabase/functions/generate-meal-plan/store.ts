import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

import type { CookingPrefs, MealPlanContext, MealPlanStore } from './handler.ts';
import type { MealPlan } from './plan.ts';

const FUNCTION_NAME = 'generate-meal-plan';

/** The preferences row's cooking columns (defaults when missing or unknown). */
export function cookingFrom(
  p:
    | { cooking_time?: string; food_budget?: string; cuisines?: string[]; leftovers?: boolean }
    | undefined,
): CookingPrefs {
  const pick = <T extends string>(v: string | undefined, allowed: readonly T[]): T =>
    allowed.includes(v as T) ? (v as T) : ('any' as T);
  return {
    time: pick(p?.cooking_time, ['quick', 'medium', 'any'] as const),
    budget: pick(p?.food_budget, ['low', 'medium', 'any'] as const),
    cuisines: p?.cuisines ?? [],
    leftovers: p?.leftovers === true,
  };
}

function must<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

/** meal_plans.meals holds the plan plus how many times it was regenerated. */
type StoredMeals = MealPlan & { regenerations?: number };

export function supabaseMealPlanStore(db: SupabaseClient): MealPlanStore {
  return {
    async context(userId): Promise<MealPlanContext> {
      const [profile, prefs, plans] = await Promise.all([
        db.from('profiles').select('is_premium').eq('user_id', userId).single(),
        db
          .from('preferences')
          .select(
            'diet_styles, restrictions, restriction_other, allergies, allergy_other, avoid_foods, cooking_time, food_budget, cuisines, leftovers',
          )
          .eq('user_id', userId)
          .limit(1),
        db
          .from('plans')
          .select('daily_calories, protein_g')
          .eq('user_id', userId)
          .order('version', { ascending: false })
          .limit(1),
      ]);
      const p = (must(prefs) as Record<string, unknown>[] | null)?.[0] as
        | {
            diet_styles: string[];
            restrictions: string[];
            restriction_other: string | null;
            allergies: string[];
            allergy_other: string | null;
            avoid_foods: string[];
            cooking_time?: string;
            food_budget?: string;
            cuisines?: string[];
            leftovers?: boolean;
          }
        | undefined;
      const plan = (must(plans) as { daily_calories: number; protein_g: number }[] | null)?.[0];
      return {
        premium: Boolean((must(profile) as { is_premium: boolean }).is_premium),
        prefs: {
          dietStyles: p?.diet_styles ?? [],
          restrictions: p?.restrictions ?? [],
          restrictionOther: p?.restriction_other ?? null,
          allergies: p?.allergies ?? [],
          allergyOther: p?.allergy_other ?? null,
          avoidFoods: p?.avoid_foods ?? [],
        },
        targets: plan ? { calories: plan.daily_calories, proteinG: plan.protein_g } : null,
        cooking: cookingFrom(p),
      };
    },

    async existing(userId, date) {
      const rows = must(
        await db.from('meal_plans').select('meals').eq('user_id', userId).eq('date', date).limit(1),
      ) as { meals: StoredMeals }[] | null;
      const meals = rows?.[0]?.meals;
      if (!meals) return null;
      const { regenerations = 0, ...plan } = meals;
      return { plan: plan as MealPlan, regenerations };
    },

    async save(userId, date, plan, regenerations) {
      must(
        await db
          .from('meal_plans')
          .upsert(
            { user_id: userId, date, meals: { ...plan, regenerations } },
            { onConflict: 'user_id,date' },
          ),
      );
    },

    async callsSince(userId, since) {
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

    async logUsage(userId, model, inputTokens, outputTokens, cache) {
      must(
        await db.from('ai_usage').insert({
          user_id: userId,
          function_name: FUNCTION_NAME,
          model,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          cache_read_tokens: cache?.read ?? 0,
          cache_write_tokens: cache?.write ?? 0,
        }),
      );
    },
  };
}
