import { createClient } from 'jsr:@supabase/supabase-js@2';

import { userIdFromRequest } from '../_shared/auth.ts';
import { supabaseRateLimiter, supabaseUserLimits, userRateGuard } from '../_shared/rateLimit.ts';
import { handleFoodBarcode } from './handler.ts';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);
const userAgent = Deno.env.get('OFF_USER_AGENT') || 'DietBuddy/1.0 (https://dietbuddy.me)';
const admit = userRateGuard({
  name: 'food_barcode',
  userId: (r) => userIdFromRequest(admin, r),
  limiter: supabaseRateLimiter(admin),
  limits: supabaseUserLimits(admin, 'food_barcode', { perMinute: 20, perDay: 300 }),
});

Deno.serve((req) => handleFoodBarcode(req, { fetch, userAgent, admit }));
