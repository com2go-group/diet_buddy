import { webcrypto } from 'node:crypto';

import {
  derToRaw,
  handleAdmobSsv,
  validTarget,
  type SsvDeps,
} from '../../functions/admob-ssv/handler';

const subtle = webcrypto.subtle as unknown as SubtleCrypto;
const USER = '11111111-1111-4111-8111-111111111111';
const NOW = new Date('2026-09-27T12:00:00Z');

/** Raw r‖s → DER, to sign like Google does. */
function rawToDer(raw: Uint8Array): Uint8Array {
  const int = (b: Uint8Array) => {
    let i = 0;
    while (i < b.length - 1 && b[i] === 0) i++;
    let v = b.slice(i);
    if (v[0]! & 0x80) v = Uint8Array.from([0, ...v]);
    return [0x02, v.length, ...v];
  };
  const body = [...int(raw.slice(0, 32)), ...int(raw.slice(32))];
  return Uint8Array.from([0x30, body.length, ...body]);
}
const b64url = (b: Uint8Array) => Buffer.from(b).toString('base64url');

async function setup() {
  const pair = (await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair;
  const spki = Buffer.from(await subtle.exportKey('spki', pair.publicKey)).toString('base64');
  const sign = async (params: string) => {
    const raw = new Uint8Array(
      await subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        pair.privateKey,
        new TextEncoder().encode(params),
      ),
    );
    return `${params}&signature=${b64url(rawToDer(raw))}&key_id=123`;
  };
  const unlocks: [string, string, string][] = [];
  const deps: SsvDeps = {
    subtle,
    now: () => NOW,
    getKeys: async () => [{ keyId: 123, base64: spki }],
    recordUnlock: async (u, t, x) => void unlocks.push([u, t, x]),
  };
  return { sign, deps, unlocks };
}

const params = (custom: object, user = USER) =>
  `ad_network=5450213213286189855&ad_unit=1234&custom_data=${encodeURIComponent(JSON.stringify(custom))}&reward_amount=1&reward_item=Reward&timestamp=1790000000000&transaction_id=abc&user_id=${user}`;
const get = (query: string) => new Request(`https://x/functions/v1/admob-ssv?${query}`);

describe('admob-ssv', () => {
  it('records a correctly signed reward', async () => {
    const { sign, deps, unlocks } = await setup();
    const res = await handleAdmobSsv(
      get(await sign(params({ type: 'meal_plan', target: '2026-09-27:lunch' }))),
      deps,
    );
    expect(res.status).toBe(200);
    expect(unlocks).toEqual([[USER, 'meal_plan', '2026-09-27:lunch']]);
  });

  it('rejects tampered or unsigned rewards', async () => {
    const { sign, deps, unlocks } = await setup();
    const signed = await sign(params({ type: 'ai_plan', target: 'initial' }));
    const tampered = signed.replace(USER, '22222222-2222-4222-8222-222222222222');
    expect((await handleAdmobSsv(get(tampered), deps)).status).toBe(401);
    expect(
      (await handleAdmobSsv(get(params({ type: 'ai_plan', target: 'initial' })), deps)).status,
    ).toBe(401);
    expect(unlocks).toEqual([]);
  });

  it('refuses unlocks for other days or unknown targets', async () => {
    const { sign, deps, unlocks } = await setup();
    const res = await handleAdmobSsv(
      get(await sign(params({ type: 'meal_plan', target: '2026-09-01:lunch' }))),
      deps,
    );
    expect(res.status).toBe(400);
    expect(unlocks).toEqual([]);
    expect(validTarget('meal_plan', '2026-09-26:dinner', NOW)).toBe(true);
    expect(validTarget('meal_plan', '2026-09-26', NOW)).toBe(false);
    expect(validTarget('meal_plan', '2026-09-26:brunch', NOW)).toBe(false);
    expect(validTarget('meal_plan', '2026-09-28:breakfast', NOW)).toBe(true);
    expect(validTarget('ai_plan', 'other', NOW)).toBe(false);
  });

  it('answers Google’s unsigned verification ping', async () => {
    const { deps } = await setup();
    expect((await handleAdmobSsv(get(''), deps)).status).toBe(200);
  });

  it('converts DER signatures with leading zeros', () => {
    const raw = new Uint8Array(64).fill(0x7f);
    raw[0] = 0;
    expect(derToRaw(rawToDer(raw))).toEqual(raw);
  });
});
