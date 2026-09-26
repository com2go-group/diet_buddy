import { createClient } from 'jsr:@supabase/supabase-js@2';

import { DEFAULT_SETTINGS, handleSendSms, smsToProvider, type SmsProvider } from './handler.ts';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  {
    auth: { persistSession: false },
  },
);
const smsToKey = Deno.env.get('SMSTO_API_KEY');
const providers: Record<string, SmsProvider> = smsToKey ? { smsto: smsToProvider(smsToKey) } : {};

Deno.serve((req) =>
  handleSendSms(req, {
    secret: Deno.env.get('SEND_SMS_HOOK_SECRET')!,
    providers,
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
