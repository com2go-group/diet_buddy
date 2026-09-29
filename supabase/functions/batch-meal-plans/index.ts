import { createClient } from 'jsr:@supabase/supabase-js@2';

import { FREE_AI_MODEL_DEFAULT } from '../_shared/aiAllowanceStore.ts';
import { anthropicBatchClient } from '../_shared/anthropicBatch.ts';
import { anthropicProvider } from '../_shared/llm.ts';
import { searchUsda } from '../_shared/usdaClient.ts';
import { cachedSearch } from '../_shared/usdaCache.ts';
import { handleBatchMealPlans } from './handler.ts';
import { supabaseBatchStore } from './store.ts';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});
const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
const usdaKey = Deno.env.get('USDA_API_KEY');
const model = Deno.env.get('FREE_AI_MODEL') || FREE_AI_MODEL_DEFAULT;
const configured = Boolean(anthropicKey && usdaKey);
const store = supabaseBatchStore(db);

Deno.serve((req) =>
  handleBatchMealPlans(req, {
    secret: Deno.env.get('CRON_SECRET'),
    store,
    batch: configured ? anthropicBatchClient(anthropicKey!) : null,
    model,
    llm: configured ? anthropicProvider(anthropicKey!, model) : null,
    // Same generic foods as generate-meal-plan, through the shared cache (USDA's hourly limit).
    searchFoods: cachedSearch(db, (q) =>
      searchUsda(q, usdaKey!, fetch, ['Foundation', 'SR Legacy', 'Survey (FNDDS)'], 10),
    ),
  }),
);
