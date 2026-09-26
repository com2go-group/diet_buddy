import { z } from 'npm:zod@4';

import { fail, json } from '../_shared/http.ts';

/**
 * AdMob rewarded-ad server-side verification (SSV). Google calls this URL with a signed query
 * string when a user earns a reward; only then is the unlock recorded (CLAUDE.md §12: reward
 * only on the AdMob reward callback). The app never writes ad_unlocks itself.
 * https://developers.google.com/admob/android/ssv
 */

export const VERIFIER_KEYS_URL = 'https://www.gstatic.com/admob/reward/verifier-keys.json';

export interface VerifierKey {
  keyId: number;
  base64: string;
}

export interface SsvDeps {
  subtle: SubtleCrypto;
  getKeys(): Promise<VerifierKey[]>;
  /** Records the unlock; duplicates (same user, type, target) are ignored. */
  recordUnlock(userId: string, type: 'meal_plan' | 'ai_plan', target: string): Promise<void>;
  now?: () => Date;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const customDataSchema = z.object({
  type: z.enum(['meal_plan', 'ai_plan']),
  target: z.string().max(24),
});

const b64urlToBytes = (s: string): Uint8Array => {
  const b64 = s
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(s.length / 4) * 4, '=');
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
};

/** DER-encoded ECDSA signature → the raw r‖s form WebCrypto expects (P-256: 32 + 32 bytes). */
export function derToRaw(der: Uint8Array): Uint8Array<ArrayBuffer> {
  if (der[0] !== 0x30) throw new Error('not DER');
  let offset = 2;
  const read = () => {
    if (der[offset] !== 0x02) throw new Error('bad DER integer');
    const len = der[offset + 1]!;
    let int = der.slice(offset + 2, offset + 2 + len);
    offset += 2 + len;
    while (int.length > 32 && int[0] === 0) int = int.slice(1);
    const out = new Uint8Array(32);
    out.set(int, 32 - int.length);
    return out;
  };
  const r = read();
  const s = read();
  const raw = new Uint8Array(64);
  raw.set(r, 0);
  raw.set(s, 32);
  return raw;
}

/** Checks Google's signature over the query string up to "&signature=". */
export async function verifySignature(
  query: string,
  deps: Pick<SsvDeps, 'subtle' | 'getKeys'>,
): Promise<boolean> {
  const at = query.indexOf('&signature=');
  if (at < 0) return false;
  const message = query.slice(0, at);
  const params = new URLSearchParams(query);
  const signature = params.get('signature');
  const keyId = Number(params.get('key_id'));
  if (!signature || !Number.isFinite(keyId)) return false;
  const key = (await deps.getKeys()).find((k) => k.keyId === keyId);
  if (!key) return false;
  const publicKey = await deps.subtle.importKey(
    'spki',
    Uint8Array.from(atob(key.base64), (c) => c.charCodeAt(0)),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify'],
  );
  return deps.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    publicKey,
    derToRaw(b64urlToBytes(signature)),
    new TextEncoder().encode(message),
  );
}

const dayKeyUtc = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Meal plans unlock one meal ("YYYY-MM-DD:slot") for "today" in any time zone (server date
 * ±1 day); the AI plan once.
 */
export function validTarget(type: 'meal_plan' | 'ai_plan', target: string, now: Date): boolean {
  if (type === 'ai_plan') return target === 'initial';
  const match = /^(\d{4}-\d{2}-\d{2}):(breakfast|lunch|snack|dinner)$/.exec(target);
  if (!match) return false;
  const day = 86_400_000;
  return [-day, 0, day].some((d) => dayKeyUtc(new Date(now.getTime() + d)) === match[1]);
}

export async function handleAdmobSsv(req: Request, deps: SsvDeps): Promise<Response> {
  if (req.method !== 'GET') return fail('method_not_allowed', 405);
  const query = new URL(req.url).search.replace(/^\?/, '');
  // Google sends an unsigned request when the SSV URL is saved in the AdMob console.
  if (!query) return json({ ok: true });
  try {
    if (!(await verifySignature(query, deps))) return fail('invalid_signature', 401);
    const params = new URLSearchParams(query);
    const userId = params.get('user_id') ?? '';
    const custom = customDataSchema.safeParse(JSON.parse(params.get('custom_data') ?? 'null'));
    if (!UUID.test(userId) || !custom.success) return fail('invalid_reward', 400);
    const { type, target } = custom.data;
    if (!validTarget(type, target, deps.now?.() ?? new Date())) return fail('invalid_target', 400);
    await deps.recordUnlock(userId, type, target);
    return json({ ok: true });
  } catch (e) {
    console.error('admob-ssv failed', e);
    return fail('server_error', 500);
  }
}
