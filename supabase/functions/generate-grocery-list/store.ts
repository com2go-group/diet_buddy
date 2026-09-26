import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

import { GROCERY_PROMPT_VERSION } from '../_prompts/grocery.v1.ts';
import type { GroceryStore, StoredList } from './handler.ts';
import type { GroceryItem, PlanItem } from './list.ts';

const FUNCTION_NAME = 'generate-grocery-list';

function must<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

interface Row {
  start_date: string;
  days: number;
  items: GroceryItem[];
  estimated_cost: number | null;
  currency: string;
  checked: string[];
}

export function supabaseGroceryStore(db: SupabaseClient): GroceryStore {
  return {
    async isPremium(userId) {
      const row = must(
        await db.from('profiles').select('is_premium').eq('user_id', userId).single(),
      );
      return Boolean((row as { is_premium: boolean }).is_premium);
    },

    async existing(userId, startDate): Promise<StoredList | null> {
      const rows = must(
        await db
          .from('grocery_lists')
          .select('start_date, days, items, estimated_cost, currency, checked')
          .eq('user_id', userId)
          .eq('start_date', startDate)
          .limit(1),
      ) as Row[] | null;
      const r = rows?.[0];
      return r
        ? {
            startDate: r.start_date,
            days: r.days,
            items: r.items,
            estimatedCost: r.estimated_cost === null ? null : Number(r.estimated_cost),
            currency: r.currency,
            checked: r.checked,
          }
        : null;
    },

    async plans(userId, dates) {
      const rows = must(
        await db.from('meal_plans').select('date, meals').eq('user_id', userId).in('date', dates),
      ) as { date: string; meals: { slots?: Record<string, PlanItem[]> } }[] | null;
      return (rows ?? [])
        .filter((r) => r.meals?.slots)
        .map((r) => ({ date: r.date, slots: r.meals.slots! }));
    },

    async save(userId, list, model) {
      must(
        await db.from('grocery_lists').upsert(
          {
            user_id: userId,
            start_date: list.startDate,
            days: list.days,
            items: list.items,
            estimated_cost: list.estimatedCost,
            currency: list.currency,
            checked: [],
            model,
            prompt_version: GROCERY_PROMPT_VERSION,
          },
          { onConflict: 'user_id,start_date' },
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
