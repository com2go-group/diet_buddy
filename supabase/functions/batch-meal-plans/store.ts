import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

import type { MealPlanContext } from '../generate-meal-plan/handler.ts';
import { supabaseMealPlanStore } from '../generate-meal-plan/store.ts';
import { DEFAULT_SETTINGS, type BatchStore, type Counts } from './handler.ts';

const FUNCTION_NAME = 'batch-meal-plans';
/** User IDs per `in (...)` query, keeping the request URL short. */
const CHUNK = 150;

function must<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

const whole = (v: unknown, fallback: number, min: number, max: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
};

const countsOf = (r: Record<string, unknown> | null): Counts => ({
  stored: Number(r?.stored) || 0,
  skipped: Number(r?.skipped) || 0,
  failed: Number(r?.failed) || 0,
});

export function supabaseBatchStore(db: SupabaseClient): BatchStore {
  const meals = supabaseMealPlanStore(db);
  return {
    async settings() {
      const rows = must(
        await db
          .from('app_config')
          .select('key, value')
          .in('key', [
            'meal_plan_batch_hour_utc',
            'meal_plan_batch_max_users',
            'meal_plan_batch_parallel',
          ]),
      ) as { key: string; value: unknown }[] | null;
      const map = new Map((rows ?? []).map((r) => [r.key, r.value]));
      return {
        hourUtc: whole(map.get('meal_plan_batch_hour_utc'), DEFAULT_SETTINGS.hourUtc, 0, 23),
        maxUsers: whole(map.get('meal_plan_batch_max_users'), DEFAULT_SETTINGS.maxUsers, 0, 100000),
        parallel: whole(map.get('meal_plan_batch_parallel'), DEFAULT_SETTINGS.parallel, 1, 50),
      };
    },

    async pending() {
      const rows = must(
        await db
          .from('meal_plan_batches')
          .select('id, batch_id, plan_date, created_at, results')
          .eq('status', 'submitted')
          .order('created_at'),
      ) as
        | {
            id: string;
            batch_id: string;
            plan_date: string;
            created_at: string;
            results: Record<string, unknown> | null;
          }[]
        | null;
      return (rows ?? []).map((r) => ({
        id: r.id,
        batchId: r.batch_id,
        planDate: r.plan_date,
        createdAt: new Date(r.created_at),
        offset: Number(r.results?.offset) || 0,
        counts: countsOf(r.results),
      }));
    },

    async hasBatch(date) {
      const rows = must(
        await db.from('meal_plan_batches').select('id').eq('plan_date', date).limit(1),
      ) as unknown[] | null;
      return Boolean(rows?.length);
    },

    async candidates(date, limit) {
      const rows = must(await db.rpc('batch_plan_candidates', { p_date: date, p_limit: limit })) as
        { user_id: string; language: string | null }[] | null;
      return (rows ?? []).map((r) => ({ userId: r.user_id, language: r.language }));
    },

    async contexts(userIds) {
      const out = new Map<string, MealPlanContext>();
      for (let i = 0; i < userIds.length; i += CHUNK) {
        const ids = userIds.slice(i, i + CHUNK);
        const [profiles, prefs, plans] = await Promise.all([
          db.from('profiles').select('user_id, is_premium').in('user_id', ids),
          db
            .from('preferences')
            .select(
              'user_id, diet_styles, restrictions, restriction_other, allergies, allergy_other, avoid_foods',
            )
            .in('user_id', ids),
          db
            .from('plans')
            .select('user_id, version, daily_calories, protein_g')
            .in('user_id', ids)
            .order('version', { ascending: false }),
        ]);
        const premium = new Map(
          ((must(profiles) ?? []) as { user_id: string; is_premium: boolean }[]).map((p) => [
            p.user_id,
            p.is_premium,
          ]),
        );
        const prefOf = new Map(
          (
            (must(prefs) ?? []) as {
              user_id: string;
              diet_styles: string[];
              restrictions: string[];
              restriction_other: string | null;
              allergies: string[];
              allergy_other: string | null;
              avoid_foods: string[];
            }[]
          ).map((p) => [p.user_id, p]),
        );
        const planOf = new Map<string, { daily_calories: number; protein_g: number }>();
        for (const p of (must(plans) ?? []) as {
          user_id: string;
          daily_calories: number;
          protein_g: number;
        }[]) {
          // Newest version first: keep the first row per user.
          if (!planOf.has(p.user_id)) planOf.set(p.user_id, p);
        }
        for (const id of ids) {
          const p = prefOf.get(id);
          const plan = planOf.get(id);
          out.set(id, {
            premium: Boolean(premium.get(id)),
            prefs: {
              dietStyles: p?.diet_styles ?? [],
              restrictions: p?.restrictions ?? [],
              restrictionOther: p?.restriction_other ?? null,
              allergies: p?.allergies ?? [],
              allergyOther: p?.allergy_other ?? null,
              avoidFoods: p?.avoid_foods ?? [],
            },
            targets: plan ? { calories: plan.daily_calories, proteinG: plan.protein_g } : null,
          });
        }
      }
      return out;
    },

    async record(batchId, date, count) {
      must(
        await db
          .from('meal_plan_batches')
          .insert({ batch_id: batchId, plan_date: date, request_count: count }),
      );
    },

    async progress(id, offset, counts) {
      must(
        await db
          .from('meal_plan_batches')
          .update({ results: { offset, ...counts } })
          .eq('id', id),
      );
    },

    async finish(id, status, counts) {
      must(
        await db
          .from('meal_plan_batches')
          .update({ status, results: counts, processed_at: new Date().toISOString() })
          .eq('id', id),
      );
    },

    context: (userId) => meals.context(userId),

    async hasPlan(userId, date) {
      return (await meals.existing(userId, date)) !== null;
    },

    async languageOf(userId) {
      const rows = must(
        await db.from('profiles').select('language').eq('user_id', userId).limit(1),
      ) as { language: string | null }[] | null;
      return rows?.[0]?.language ?? null;
    },

    save: (userId, date, plan) => meals.save(userId, date, plan, 0),

    async logUsage(userId, model, inputTokens, outputTokens, batch) {
      must(
        await db.from('ai_usage').insert({
          user_id: userId,
          function_name: FUNCTION_NAME,
          model,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          batch,
        }),
      );
    },
  };
}
