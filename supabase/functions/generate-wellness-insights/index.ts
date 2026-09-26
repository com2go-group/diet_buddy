import { createClient } from 'jsr:@supabase/supabase-js@2';

import { userIdFromRequest } from '../_shared/auth.ts';
import { anthropicProvider } from '../_shared/llm.ts';
import { handleWellnessInsights } from './handler.ts';
import { supabaseWellnessStore } from './store.ts';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);
const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
const model = Deno.env.get('WELLNESS_MODEL') ?? Deno.env.get('COACH_MODEL') ?? 'claude-sonnet-5';
const store = supabaseWellnessStore(admin);
const llm = anthropicKey ? anthropicProvider(anthropicKey, model) : null;

Deno.serve((req) =>
  handleWellnessInsights(req, {
    store,
    llm,
    getUserId: (r) => userIdFromRequest(admin, r),
  }),
);
