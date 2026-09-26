import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

import { INSIGHTS_PROMPT_VERSION } from '../_prompts/insights.v1.ts';
import type { RawData } from './aggregate.ts';
import type { AiInsight, InsightsContext, InsightsStore } from './handler.ts';

const FUNCTION_NAME = 'generate-insights';

function must<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

export function supabaseInsightsStore(db: SupabaseClient): InsightsStore {
  return {
    async context(userId): Promise<InsightsContext> {
      const [profile, plans, goals] = await Promise.all([
        db.from('profiles').select('is_premium').eq('user_id', userId).single(),
        db
          .from('plans')
          .select('daily_calories, protein_g, water_ml, forecast')
          .eq('user_id', userId)
          .order('version', { ascending: false })
          .limit(1),
        db.from('goals').select('goal_types').eq('user_id', userId).eq('active', true).limit(1),
      ]);
      const plan = (
        must(plans) as
          | {
              daily_calories: number;
              protein_g: number;
              water_ml: number;
              forecast: { weekly_change_kg?: number } | null;
            }[]
          | null
      )?.[0];
      const goal = (must(goals) as { goal_types: string[] }[] | null)?.[0];
      const weekly = plan?.forecast?.weekly_change_kg;
      return {
        premium: Boolean((must(profile) as { is_premium: boolean }).is_premium),
        targets: plan
          ? { calories: plan.daily_calories, proteinG: plan.protein_g, waterMl: plan.water_ml }
          : null,
        goalTypes: goal?.goal_types ?? [],
        weeklyChangeKg: typeof weekly === 'number' ? weekly : null,
      };
    },

    async existing(userId, day) {
      const rows = must(
        await db
          .from('ai_insights')
          .select('insights')
          .eq('user_id', userId)
          .eq('day', day)
          .limit(1),
      ) as { insights: AiInsight[] }[] | null;
      return rows?.[0]?.insights ?? null;
    },

    async raw(userId, since): Promise<RawData> {
      const iso = since.toISOString();
      const [food, water, checkins, weights] = await Promise.all([
        db
          .from('food_logs')
          .select('logged_at, calories, protein_g')
          .eq('user_id', userId)
          .gte('logged_at', iso)
          .limit(5000),
        db
          .from('water_logs')
          .select('logged_at, ml')
          .eq('user_id', userId)
          .gte('logged_at', iso)
          .limit(5000),
        db
          .from('checkins')
          .select('date, mood, energy, sleep_hours, hunger')
          .eq('user_id', userId)
          .gte('date', iso.slice(0, 10)),
        db
          .from('body_metrics')
          .select('measured_at, weight_kg')
          .eq('user_id', userId)
          .not('weight_kg', 'is', null)
          .gte('measured_at', iso),
      ]);
      return {
        food: (must(food) as RawData['food'] | null) ?? [],
        water: (must(water) as RawData['water'] | null) ?? [],
        checkins: (must(checkins) as RawData['checkins'] | null) ?? [],
        weights: (must(weights) as RawData['weights'] | null) ?? [],
      };
    },

    async save(userId, day, insights, model) {
      must(
        await db
          .from('ai_insights')
          .upsert(
            { user_id: userId, day, insights, model, prompt_version: INSIGHTS_PROMPT_VERSION },
            { onConflict: 'user_id,day' },
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
