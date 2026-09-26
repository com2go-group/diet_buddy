/**
 * Standard Webhooks signature check (used by Supabase Auth hooks): HMAC-SHA256 over
 * "id.timestamp.body" with the base64 secret from "v1,whsec_<base64>". Pure Web Crypto.
 */

const TOLERANCE_SECONDS = 5 * 60;

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export async function signPayload(
  secret: string,
  id: string,
  timestamp: string,
  body: string,
  subtle: SubtleCrypto = crypto.subtle,
): Promise<string> {
  const key = await subtle.importKey(
    'raw',
    base64ToBytes(secret.replace(/^v1,/, '').replace(/^whsec_/, '')),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${id}.${timestamp}.${body}`),
  );
  return bytesToBase64(new Uint8Array(mac));
}

export async function verifyWebhook(
  secret: string,
  headers: Headers,
  body: string,
  now: Date,
  subtle: SubtleCrypto = crypto.subtle,
): Promise<boolean> {
  const id = headers.get('webhook-id');
  const timestamp = headers.get('webhook-timestamp');
  const signatures = headers.get('webhook-signature');
  if (!id || !timestamp || !signatures) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now.getTime() / 1000 - ts) > TOLERANCE_SECONDS) return false;
  const expected = await signPayload(secret, id, timestamp, body, subtle);
  return signatures
    .split(' ')
    .map((s) => s.split(',')[1])
    .some((sig) => sig !== undefined && sig.length === expected.length && sig === expected);
}
