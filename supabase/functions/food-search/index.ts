import { createClient } from 'jsr:@supabase/supabase-js@2';

import { userIdFromRequest } from '../_shared/auth.ts';
import { anthropicProvider } from '../_shared/llm.ts';
import { supabaseRateLimiter, supabaseUserLimits, userRateGuard } from '../_shared/rateLimit.ts';
import { handleFoodSearch } from './handler.ts';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);
const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
// A small model is enough to translate a search term.
const model = Deno.env.get('SEARCH_TRANSLATE_MODEL') || 'claude-haiku-4-5-20251001';
const llm = anthropicKey ? anthropicProvider(anthropicKey, model) : null;
const admit = userRateGuard({
  name: 'food_search',
  userId: (r) => userIdFromRequest(admin, r),
  limiter: supabaseRateLimiter(admin),
  limits: supabaseUserLimits(admin, 'food_search', { perMinute: 30, perDay: 600 }),
});

type EuRow = {
  source: string;
  code: string;
  name: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
};

/** CIQUAL (and later other EU tables): French users search French names, others English. */
async function searchEu(typed: string, english: string, language?: string) {
  const local = language === 'fr';
  const { data, error } = await admin.rpc('search_eu_foods', {
    p_query: local ? typed : english,
    p_lang: local ? 'fr' : 'en',
    p_limit: 10,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as EuRow[]).map((r) => ({
    ref: `${r.source}:${r.code}`,
    name: r.name,
    brand: null,
    per100g: {
      kcal: Number(r.kcal),
      proteinG: Number(r.protein_g),
      carbsG: Number(r.carbs_g),
      fatG: Number(r.fat_g),
      fiberG: Number(r.fiber_g),
    },
    servings: [],
  }));
}

Deno.serve((req) =>
  handleFoodSearch(req, { apiKey: Deno.env.get('USDA_API_KEY'), fetch, llm, admit, searchEu }),
);
