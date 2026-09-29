import { createClient } from 'jsr:@supabase/supabase-js@2';

import { userIdFromRequest } from '../_shared/auth.ts';
import { FREE_AI_MODEL_DEFAULT, supabaseAllowance } from '../_shared/aiAllowanceStore.ts';
import { anthropicProvider } from '../_shared/llm.ts';
import { searchUsda } from '../_shared/usdaClient.ts';
import { cachedSearch } from '../_shared/usdaCache.ts';
import { handleGenerateMealPlan } from './handler.ts';
import { supabaseMealPlanStore } from './store.ts';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  {
    auth: { persistSession: false },
  },
);
const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
const usdaKey = Deno.env.get('USDA_API_KEY');
const model = Deno.env.get('MEAL_PLAN_MODEL') || Deno.env.get('COACH_MODEL') || 'claude-sonnet-5';
const store = supabaseMealPlanStore(admin);
const llm = anthropicKey && usdaKey ? anthropicProvider(anthropicKey, model) : null;
const freeModel = Deno.env.get('FREE_AI_MODEL') || FREE_AI_MODEL_DEFAULT;
const freeLlm = anthropicKey && usdaKey ? anthropicProvider(anthropicKey, freeModel) : null;

Deno.serve((req) =>
  handleGenerateMealPlan(req, {
    store,
    llm,
    freeLlm,
    allowance: supabaseAllowance(admin),
    async freeSwaps() {
      const { data } = await admin
        .from('app_config')
        .select('value')
        .eq('key', 'meal_swaps_daily_free')
        .maybeSingle();
      const n = Number((data as { value: unknown } | null)?.value);
      return Number.isInteger(n) && n >= 0 ? n : 3;
    },
    getUserId: (r) => userIdFromRequest(admin, r),
    // Generic foods only: branded products vary too much for a plan. Shared cache (USDA's limit).
    searchFoods: cachedSearch(admin, (q) =>
      searchUsda(q, usdaKey!, fetch, ['Foundation', 'SR Legacy', 'Survey (FNDDS)'], 10),
    ),
  }),
);
