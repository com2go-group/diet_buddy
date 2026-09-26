import { createClient } from 'jsr:@supabase/supabase-js@2';

import { handleRevenueCatWebhook } from './handler.ts';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  {
    auth: { persistSession: false },
  },
);

Deno.serve((req) =>
  handleRevenueCatWebhook(req, {
    secret: Deno.env.get('REVENUECAT_WEBHOOK_AUTH'),
    async applyPremium(userId, premium, eventAt) {
      const { data, error } = await admin.rpc('apply_premium_event', {
        target_user: userId,
        premium,
        event_at: eventAt.toISOString(),
      });
      if (error) throw new Error(error.message);
      return Boolean(data);
    },
  }),
);
