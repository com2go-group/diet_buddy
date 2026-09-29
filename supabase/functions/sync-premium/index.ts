import { createClient } from 'jsr:@supabase/supabase-js@2';

import { userIdFromRequest } from '../_shared/auth.ts';
import { handleSyncPremium } from './handler.ts';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  {
    auth: { persistSession: false },
  },
);

Deno.serve((req) =>
  handleSyncPremium(req, {
    getUserId: (r) => userIdFromRequest(admin, r),
    secretKey: Deno.env.get('REVENUECAT_SECRET_KEY') || undefined,
    fetch,
    async applyPremium(userId, premium, at) {
      const { data, error } = await admin.rpc('apply_premium_event', {
        target_user: userId,
        premium,
        event_at: at.toISOString(),
      });
      if (error) throw new Error(error.message);
      return Boolean(data);
    },
  }),
);
