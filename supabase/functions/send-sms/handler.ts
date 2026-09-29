import { z } from 'npm:zod@4';

import type { RateLimiter } from '../_shared/rateLimit.ts';
import { verifyWebhook } from '../_shared/standardWebhooks.ts';

/** Admin-editable settings (app_config): which provider and sender name to use. */
export interface SmsSettings {
  provider: string;
  senderId: string;
}

/**
 * Protection against SMS pumping (bots requesting codes to expensive numbers): only these
 * calling codes, and caps per number and overall (app_config `sms_guard`).
 */
export interface SmsGuard {
  allowedPrefixes: string[];
  perNumberHour: number;
  perNumberDay: number;
  globalHour: number;
  globalDay: number;
}

/** EU/EEA, UK and Switzerland (the launch markets). */
export const DEFAULT_GUARD: SmsGuard = {
  allowedPrefixes: [
    '30',
    '31',
    '32',
    '33',
    '34',
    '351',
    '352',
    '353',
    '354',
    '356',
    '357',
    '358',
    '359',
    '36',
    '370',
    '371',
    '372',
    '385',
    '386',
    '39',
    '40',
    '41',
    '420',
    '421',
    '423',
    '43',
    '44',
    '45',
    '46',
    '47',
    '48',
    '49',
  ],
  perNumberHour: 3,
  perNumberDay: 6,
  globalHour: 300,
  globalDay: 2000,
};

export interface SmsProvider {
  send(to: string, message: string, senderId: string): Promise<void>;
}

export interface SendSmsDeps {
  /** SEND_SMS_HOOK_SECRET from Supabase Auth → Hooks ("v1,whsec_…"). */
  secret: string;
  settings(): Promise<SmsSettings>;
  guard(): Promise<SmsGuard>;
  rateLimit: RateLimiter;
  /** Keyed hash of the number: counters never hold the phone number itself. */
  hashPhone(phone: string): Promise<string>;
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

/** Whether the E.164 number (with "+") starts with one of the allowed calling codes. */
export function allowedNumber(phone: string, prefixes: string[]): boolean {
  const digits = phone.replace(/^\+/, '');
  return prefixes.some((p) => digits.startsWith(p));
}

/**
 * All caps are counted (a refused attempt counts too) so a burst can't slip between checks.
 * Returns true when this code may be sent.
 */
export async function withinLimits(
  deps: Pick<SendSmsDeps, 'rateLimit'>,
  hash: string,
  guard: SmsGuard,
): Promise<boolean> {
  const checks = await Promise.all([
    deps.rateLimit(`sms:${hash}`, 3600, guard.perNumberHour),
    deps.rateLimit(`sms:${hash}`, 86_400, guard.perNumberDay),
    deps.rateLimit('sms:all', 3600, guard.globalHour),
    deps.rateLimit('sms:all', 86_400, guard.globalDay),
  ]);
  return checks.every(Boolean);
}

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
  const guard = await deps.guard().catch(() => DEFAULT_GUARD);
  // The app maps these messages to "use email instead" / "try again later".
  if (!allowedNumber(to, guard.allowedPrefixes)) {
    return hookError(400, 'sms_country_not_supported');
  }
  try {
    if (!(await withinLimits(deps, await deps.hashPhone(to), guard))) {
      console.warn('send-sms: limit reached');
      return hookError(429, 'sms_limit_reached');
    }
  } catch (e) {
    // Fail closed: without the counters an attacker could send unlimited texts.
    console.error('send-sms: rate limit check failed', e);
    return hookError(503, 'sms_limit_reached');
  }
  try {
    await provider.send(to, otpMessage(parsed.data.sms.otp), settings.senderId);
  } catch (e) {
    console.error('send-sms failed', e);
    return hookError(502, 'the SMS could not be sent');
  }
  return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
}

/** Settings value → guard; anything missing or malformed falls back to the default. */
export function guardFrom(value: unknown): SmsGuard {
  const v = (value ?? {}) as Record<string, unknown>;
  const n = (x: unknown, d: number) =>
    Number.isInteger(x) && (x as number) >= 0 ? (x as number) : d;
  const prefixes = Array.isArray(v.allowed_prefixes)
    ? v.allowed_prefixes.filter(
        (p): p is string => typeof p === 'string' && /^[1-9]\d{0,3}$/.test(p),
      )
    : null;
  return {
    allowedPrefixes: prefixes ?? DEFAULT_GUARD.allowedPrefixes,
    perNumberHour: n(v.per_number_hour, DEFAULT_GUARD.perNumberHour),
    perNumberDay: n(v.per_number_day, DEFAULT_GUARD.perNumberDay),
    globalHour: n(v.global_hour, DEFAULT_GUARD.globalHour),
    globalDay: n(v.global_day, DEFAULT_GUARD.globalDay),
  };
}

/** HMAC-SHA-256 of the number with the hook secret, hex. */
export async function hmacPhone(
  secret: string,
  phone: string,
  subtle: SubtleCrypto = crypto.subtle,
): Promise<string> {
  const key = await subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await subtle.sign('HMAC', key, new TextEncoder().encode(phone));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
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
