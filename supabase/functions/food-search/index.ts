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

Deno.serve((req) =>
  handleFoodSearch(req, { apiKey: Deno.env.get('USDA_API_KEY'), fetch, llm, admit }),
);
