import { createClient } from 'jsr:@supabase/supabase-js@2';

import { supabaseRateLimiter } from '../_shared/rateLimit.ts';
import {
  DEFAULT_SETTINGS,
  guardFrom,
  handleSendSms,
  hmacPhone,
  smsToProvider,
  type SmsProvider,
} from './handler.ts';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  {
    auth: { persistSession: false },
  },
);
const smsToKey = Deno.env.get('SMSTO_API_KEY');
const providers: Record<string, SmsProvider> = smsToKey ? { smsto: smsToProvider(smsToKey) } : {};

const secret = Deno.env.get('SEND_SMS_HOOK_SECRET')!;

Deno.serve((req) =>
  handleSendSms(req, {
    secret,
    providers,
    rateLimit: supabaseRateLimiter(admin),
    hashPhone: (phone) => hmacPhone(secret, phone),
    async guard() {
      const { data } = await admin
        .from('app_config')
        .select('value')
        .eq('key', 'sms_guard')
        .maybeSingle();
      return guardFrom((data as { value: unknown } | null)?.value);
    },
    async settings() {
      const { data } = await admin
        .from('app_config')
        .select('key, value')
        .in('key', ['sms_provider', 'sms_sender_id']);
      const map = new Map(
        (data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]),
      );
      return {
        provider: String(map.get('sms_provider') ?? DEFAULT_SETTINGS.provider),
        senderId: String(map.get('sms_sender_id') ?? DEFAULT_SETTINGS.senderId),
      };
    },
  }),
);
