import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

import type { Persona } from '../_prompts/coach.v1.ts';
import type { LlmMessage } from '../_shared/llm.ts';
import type { CoachContextData } from './context.ts';
import type { CoachStore, StoredMessage } from './handler.ts';

const FUNCTION_NAME = 'coach-chat';
const DEFAULT_DAILY_LIMIT = 5;

function must<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

/** CoachStore on a service-role client (bypasses RLS, so every query filters by user_id). */
export function supabaseCoachStore(db: SupabaseClient): CoachStore {
  return {
    async isPremium(userId) {
      const row = must(
        await db.from('profiles').select('is_premium').eq('user_id', userId).single(),
      );
      return Boolean((row as { is_premium: boolean }).is_premium);
    },

    async dailyLimit() {
      const { data } = await db
        .from('app_config')
        .select('value')
        .eq('key', 'coach_daily_message_limit_free')
        .maybeSingle();
      const value = Number((data as { value: unknown } | null)?.value);
      return Number.isFinite(value) && value >= 0 ? value : DEFAULT_DAILY_LIMIT;
    },

    async countUserMessagesSince(userId, since) {
      const rows = must(
        await db
          .from('coach_messages')
          .select('id')
          .eq('user_id', userId)
          .eq('role', 'user')
          .gte('created_at', since.toISOString())
          .limit(1000),
      );
      return (rows as unknown[]).length;
    },

    async loadContext(userId, dayStart): Promise<CoachContextData> {
      const weekAgo = new Date(dayStart.getTime() - 7 * 86_400_000);
      const [profile, goal, prefs, plan, weight, food, water, checkin] = await Promise.all([
        db
          .from('profiles')
          .select('birth_date, gender, height_cm, units, streak_days')
          .eq('user_id', userId)
          .single(),
        db
          .from('goals')
          .select('goal_types, goal_weight_kg, pace')
          .eq('user_id', userId)
          .eq('active', true)
          .limit(1),
        db
          .from('preferences')
          .select(
            'activity_level, training_frequency, diet_styles, restrictions, restriction_other, avoid_foods, allergies, allergy_other',
          )
          .eq('user_id', userId)
          .limit(1),
        db
          .from('plans')
          .select('daily_calories, protein_g, carbs_g, fat_g, water_ml')
          .eq('user_id', userId)
          .order('version', { ascending: false })
          .limit(1),
        db
          .from('body_metrics')
          .select('weight_kg')
          .eq('user_id', userId)
          .not('weight_kg', 'is', null)
          .order('measured_at', { ascending: false })
          .limit(1),
        db
          .from('food_logs')
          .select('logged_at, name, calories, protein_g, carbs_g, fat_g')
          .eq('user_id', userId)
          .gte('logged_at', weekAgo.toISOString()),
        db
          .from('water_logs')
          .select('ml')
          .eq('user_id', userId)
          .gte('logged_at', dayStart.toISOString()),
        db
          .from('checkins')
          .select('date, mood, energy, sleep_hours')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(1),
      ]);
      type Food = {
        logged_at: string;
        name: string;
        calories: number;
        protein_g: number;
        carbs_g: number;
        fat_g: number;
      };
      const p = must(profile) as {
        birth_date: string | null;
        gender: string | null;
        height_cm: number | null;
        units: 'metric' | 'imperial';
        streak_days: number;
      };
      const g = (
        must(goal) as { goal_types: string[]; goal_weight_kg: number | null; pace: string | null }[]
      )[0];
      const pr = (must(prefs) as Record<string, unknown>[])[0] as
        | {
            activity_level: string | null;
            training_frequency: string | null;
            diet_styles: string[];
            restrictions: string[];
            restriction_other: string | null;
            avoid_foods: string[];
            allergies: string[];
            allergy_other: string | null;
          }
        | undefined;
      const pl = (
        must(plan) as {
          daily_calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          water_ml: number;
        }[]
      )[0];
      const foods = must(food) as Food[];
      const todays = foods.filter((f) => new Date(f.logged_at) >= dayStart);
      const earlier = foods.filter((f) => new Date(f.logged_at) < dayStart);
      const earlierDays = new Set(earlier.map((f) => f.logged_at.slice(0, 10))).size;
      const sum = (rows: Food[], k: 'calories' | 'protein_g' | 'carbs_g' | 'fat_g') =>
        rows.reduce((a, r) => a + Number(r[k]), 0);
      const c = (
        must(checkin) as {
          date: string;
          mood: string;
          energy: number;
          sleep_hours: number | null;
        }[]
      )[0];
      return {
        profile: {
          birthDate: p.birth_date,
          gender: p.gender,
          heightCm: p.height_cm,
          units: p.units,
          streakDays: p.streak_days,
        },
        goal: g ? { types: g.goal_types, goalWeightKg: g.goal_weight_kg, pace: g.pace } : null,
        preferences: pr
          ? {
              activityLevel: pr.activity_level,
              trainingFrequency: pr.training_frequency,
              dietStyles: pr.diet_styles,
              restrictions: pr.restrictions,
              restrictionOther: pr.restriction_other,
              avoidFoods: pr.avoid_foods,
              allergies: pr.allergies,
              allergyOther: pr.allergy_other,
            }
          : null,
        plan: pl
          ? {
              calories: pl.daily_calories,
              proteinG: pl.protein_g,
              carbsG: pl.carbs_g,
              fatG: pl.fat_g,
              waterMl: pl.water_ml,
            }
          : null,
        latestWeightKg: (must(weight) as { weight_kg: number }[])[0]?.weight_kg ?? null,
        today: {
          calories: sum(todays, 'calories'),
          proteinG: sum(todays, 'protein_g'),
          carbsG: sum(todays, 'carbs_g'),
          fatG: sum(todays, 'fat_g'),
          waterMl: (must(water) as { ml: number }[]).reduce((a, w) => a + Number(w.ml), 0),
          meals: todays.map((f) => f.name),
        },
        last7DaysAvgCalories: earlierDays
          ? Math.round(sum(earlier, 'calories') / earlierDays)
          : null,
        latestCheckIn: c
          ? { date: c.date, mood: c.mood, energy: c.energy, sleepHours: c.sleep_hours }
          : null,
      };
    },

    async conversationPersona(userId, conversationId) {
      const { data } = await db
        .from('coach_conversations')
        .select('persona')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .maybeSingle();
      return (data as { persona: Persona } | null)?.persona ?? null;
    },

    async createConversation(userId, persona, title) {
      const row = must(
        await db
          .from('coach_conversations')
          .insert({ user_id: userId, persona, title })
          .select('id')
          .single(),
      );
      return (row as { id: string }).id;
    },

    async history(conversationId, limit) {
      const rows = must(
        await db
          .from('coach_messages')
          .select('role, content')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(limit),
      ) as LlmMessage[];
      return rows.reverse();
    },

    async saveExchange(userId, conversationId, persona, userText, reply) {
      const base = { user_id: userId, conversation_id: conversationId, persona };
      const user = must(
        await db
          .from('coach_messages')
          .insert({ ...base, role: 'user', content: userText })
          .select('id, role, content, created_at')
          .single(),
      ) as StoredMessage;
      const assistant = must(
        await db
          .from('coach_messages')
          .insert({ ...base, role: 'assistant', content: reply })
          .select('id, role, content, created_at')
          .single(),
      ) as StoredMessage;
      must(
        await db
          .from('coach_conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId),
      );
      return { user, assistant };
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
