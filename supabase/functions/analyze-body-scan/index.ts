import { createClient } from 'jsr:@supabase/supabase-js@2';

import { userIdFromRequest } from '../_shared/auth.ts';
import { anthropicProvider } from '../_shared/llm.ts';
import { aiEstimator, handleAnalyzeBodyScan } from './handler.ts';
import { supabaseBodyScanStore } from './store.ts';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  {
    auth: { persistSession: false },
  },
);
const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
const model = Deno.env.get('VISION_MODEL') ?? Deno.env.get('COACH_MODEL') ?? 'claude-sonnet-5';
const store = supabaseBodyScanStore(admin);
// A licensed body-scan SDK would be another BodyScanEstimator chosen here (BODY_SCAN_PROVIDER).
const estimator = anthropicKey ? aiEstimator(anthropicProvider(anthropicKey, model)) : null;

Deno.serve((req) =>
  handleAnalyzeBodyScan(req, {
    store,
    estimator,
    getUserId: (r) => userIdFromRequest(admin, r),
  }),
);
