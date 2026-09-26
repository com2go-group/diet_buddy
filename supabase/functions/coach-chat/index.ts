import { createClient } from 'jsr:@supabase/supabase-js@2';

import { anthropicProvider } from '../_shared/llm.ts';
import { handleCoachChat } from './handler.ts';
import { supabaseCoachStore } from './store.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
const model = Deno.env.get('COACH_MODEL') ?? 'claude-sonnet-5';

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const store = supabaseCoachStore(admin);
const llm = anthropicKey ? anthropicProvider(anthropicKey, model) : null;

Deno.serve((req) =>
  handleCoachChat(req, {
    store,
    llm,
    async getUserId(request) {
      const token = request.headers.get('Authorization')?.replace(/^Bearer /, '');
      if (!token) return null;
      const { data } = await admin.auth.getUser(token);
      return data.user?.id ?? null;
    },
  }),
);
