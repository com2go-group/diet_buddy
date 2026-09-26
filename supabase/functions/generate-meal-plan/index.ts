import { createClient } from 'jsr:@supabase/supabase-js@2';

import { userIdFromRequest } from '../_shared/auth.ts';
import { anthropicProvider } from '../_shared/llm.ts';
import { searchUsda } from '../_shared/usdaClient.ts';
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
const model = Deno.env.get('MEAL_PLAN_MODEL') ?? Deno.env.get('COACH_MODEL') ?? 'claude-sonnet-5';
const store = supabaseMealPlanStore(admin);
const llm = anthropicKey && usdaKey ? anthropicProvider(anthropicKey, model) : null;

Deno.serve((req) =>
  handleGenerateMealPlan(req, {
    store,
    llm,
    getUserId: (r) => userIdFromRequest(admin, r),
    // Generic foods only: branded products vary too much for a plan.
    searchFoods: (q) =>
      searchUsda(q, usdaKey!, fetch, ['Foundation', 'SR Legacy', 'Survey (FNDDS)'], 10),
  }),
);
