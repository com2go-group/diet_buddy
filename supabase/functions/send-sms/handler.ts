import { z } from 'npm:zod@4';

import { verifyWebhook } from '../_shared/standardWebhooks.ts';

/** Admin-editable settings (app_config): which provider and sender name to use. */
export interface SmsSettings {
  provider: string;
  senderId: string;
}

export interface SmsProvider {
  send(to: string, message: string, senderId: string): Promise<void>;
}

export interface SendSmsDeps {
  /** SEND_SMS_HOOK_SECRET from Supabase Auth → Hooks ("v1,whsec_…"). */
  secret: string;
  settings(): Promise<SmsSettings>;
  providers: Record<string, SmsProvider>;
  now?: () => Date;
}

export const DEFAULT_SETTINGS: SmsSettings = { provider: 'smsto', senderId: 'DietBuddy' };

const payloadSchema = z.object({
  user: z.object({ phone: z.string().regex(/^\+?\d{6,15}$/) }),
  sms: z.object({ otp: z.string().regex(/^\d{4,10}$/) }),
});

/** Hook error body Supabase Auth understands. */
const hookError = (status: number, message: string) =>
  new Response(JSON.stringify({ error: { http_code: status, message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export function otpMessage(otp: string): string {
  return `Your DietBuddy code is ${otp}. It expires in 1 hour.`;
}

/**
 * Supabase Auth "Send SMS" hook: verifies the signed request and sends the code through the
 * provider chosen in app_config (sms.to by default; decision log 2026-09-28).
 */
export async function handleSendSms(req: Request, deps: SendSmsDeps): Promise<Response> {
  if (req.method !== 'POST') return hookError(405, 'method not allowed');
  const body = await req.text();
  if (!(await verifyWebhook(deps.secret, req.headers, body, deps.now?.() ?? new Date()))) {
    return hookError(401, 'invalid signature');
  }
  let json: unknown = null;
  try {
    json = JSON.parse(body);
  } catch {
    // handled below
  }
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) return hookError(400, 'invalid payload');
  const settings = await deps.settings().catch(() => DEFAULT_SETTINGS);
  const provider = deps.providers[settings.provider];
  if (!provider) return hookError(500, `sms provider "${settings.provider}" is not configured`);
  const to = parsed.data.user.phone.startsWith('+')
    ? parsed.data.user.phone
    : `+${parsed.data.user.phone}`;
  try {
    await provider.send(to, otpMessage(parsed.data.sms.otp), settings.senderId);
  } catch (e) {
    console.error('send-sms failed', e);
    return hookError(502, 'the SMS could not be sent');
  }
  return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
}

/** sms.to (https://sms.to): POST /sms/send with a bearer API key. */
export function smsToProvider(apiKey: string, fetchFn: typeof fetch = fetch): SmsProvider {
  return {
    async send(to, message, senderId) {
      const res = await fetchFn('https://api.sms.to/sms/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, message, sender_id: senderId }),
      });
      const data = (await res.json().catch(() => null)) as { success?: boolean } | null;
      if (!res.ok || data?.success === false) throw new Error(`sms.to ${res.status}`);
    },
  };
}
