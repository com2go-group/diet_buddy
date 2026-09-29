import { webcrypto } from 'node:crypto';

import { signPayload, verifyWebhook } from '../../functions/_shared/standardWebhooks';
import {
  DEFAULT_GUARD,
  guardFrom,
  handleSendSms,
  hmacPhone,
  otpMessage,
  smsToProvider,
  type SendSmsDeps,
} from '../../functions/send-sms/handler';

const subtle = webcrypto.subtle as unknown as SubtleCrypto;
const SECRET = `v1,whsec_${Buffer.from('super-secret-key-for-tests').toString('base64')}`;
const NOW = new Date('2026-09-28T10:00:00Z');
const ts = String(Math.floor(NOW.getTime() / 1000));

async function signed(body: object, opts: { secret?: string; timestamp?: string } = {}) {
  const raw = JSON.stringify(body);
  const timestamp = opts.timestamp ?? ts;
  const sig = await signPayload(opts.secret ?? SECRET, 'msg_1', timestamp, raw, subtle);
  return new Request('http://x', {
    method: 'POST',
    body: raw,
    headers: {
      'webhook-id': 'msg_1',
      'webhook-timestamp': timestamp,
      'webhook-signature': `v1,${sig}`,
    },
  });
}

const payload = { user: { phone: '447700900123' }, sms: { otp: '482913' } };

function setup(provider = 'smsto', guard = DEFAULT_GUARD) {
  const sent: [string, string, string][] = [];
  const hits = new Map<string, number>();
  const deps: SendSmsDeps = {
    secret: SECRET,
    now: () => NOW,
    settings: async () => ({ provider, senderId: 'DietBuddy' }),
    guard: async () => guard,
    rateLimit: async (key, window, max) => {
      const k = `${key}/${window}`;
      hits.set(k, (hits.get(k) ?? 0) + 1);
      return hits.get(k)! <= max;
    },
    hashPhone: async (p) => `h(${p})`,
    providers: { smsto: { send: async (to, msg, sender) => void sent.push([to, msg, sender]) } },
  };
  return { deps, sent, hits };
}

describe('standard webhooks', () => {
  it('accepts a valid signature and rejects tampering, other secrets and old timestamps', async () => {
    const req = await signed(payload);
    const body = await req.text();
    expect(await verifyWebhook(SECRET, req.headers, body, NOW, subtle)).toBe(true);
    expect(await verifyWebhook(SECRET, req.headers, body + ' ', NOW, subtle)).toBe(false);
    const other = `v1,whsec_${Buffer.from('another-key').toString('base64')}`;
    expect(await verifyWebhook(other, req.headers, body, NOW, subtle)).toBe(false);
    const later = new Date(NOW.getTime() + 10 * 60_000);
    expect(await verifyWebhook(SECRET, req.headers, body, later, subtle)).toBe(false);
  });
});

describe('send-sms hook', () => {
  it('sends the code through sms.to with the configured sender', async () => {
    const { deps, sent } = setup();
    const res = await handleSendSms(await signed(payload), deps);
    expect(res.status).toBe(200);
    expect(sent).toEqual([['+447700900123', otpMessage('482913'), 'DietBuddy']]);
  });

  it('rejects unsigned or malformed requests without sending', async () => {
    const { deps, sent } = setup();
    const unsigned = new Request('http://x', { method: 'POST', body: JSON.stringify(payload) });
    expect((await handleSendSms(unsigned, deps)).status).toBe(401);
    expect((await handleSendSms(await signed({ user: {}, sms: {} }), deps)).status).toBe(400);
    expect(sent).toHaveLength(0);
  });

  it('reports an unknown provider or a provider failure to Supabase Auth', async () => {
    const unknown = setup('carrier-pigeon');
    const r1 = await handleSendSms(await signed(payload), unknown.deps);
    expect(r1.status).toBe(500);
    expect((await r1.json()).error.message).toContain('carrier-pigeon');
    const failing = setup();
    failing.deps.providers.smsto = {
      send: async () => {
        throw new Error('down');
      },
    };
    expect((await handleSendSms(await signed(payload), failing.deps)).status).toBe(502);
  });
});

describe('sms.to provider', () => {
  it('posts the message with a bearer key and treats success:false as a failure', async () => {
    const fetchFn = jest.fn(async () => new Response(JSON.stringify({ success: true })));
    await smsToProvider('key-1', fetchFn as unknown as typeof fetch).send(
      '+4477',
      'hi',
      'DietBuddy',
    );
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.sms.to/sms/send');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer key-1');
    expect(JSON.parse(init.body as string)).toEqual({
      to: '+4477',
      message: 'hi',
      sender_id: 'DietBuddy',
    });
    const bad = jest.fn(async () => new Response(JSON.stringify({ success: false })));
    await expect(
      smsToProvider('k', bad as unknown as typeof fetch).send('+1', 'x', 'y'),
    ).rejects.toThrow();
  });
});

describe('send-sms guard (SMS pumping)', () => {
  it('only texts allowed calling codes', async () => {
    const { deps, sent } = setup();
    const res = await handleSendSms(
      await signed({ user: { phone: '8821234567' }, sms: { otp: '123456' } }),
      deps,
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toBe('sms_country_not_supported');
    expect(sent).toHaveLength(0);
  });

  it('caps codes per number (hashed) and overall', async () => {
    const { deps, sent, hits } = setup('smsto', { ...DEFAULT_GUARD, perNumberHour: 2 });
    for (let i = 0; i < 2; i++) {
      expect((await handleSendSms(await signed(payload), deps)).status).toBe(200);
    }
    const third = await handleSendSms(await signed(payload), deps);
    expect(third.status).toBe(429);
    expect((await third.json()).error.message).toBe('sms_limit_reached');
    expect(sent).toHaveLength(2);
    expect([...hits.keys()]).toContain('sms:h(+447700900123)/3600');

    const global = setup('smsto', { ...DEFAULT_GUARD, globalDay: 0 });
    expect((await handleSendSms(await signed(payload), global.deps)).status).toBe(429);
  });

  it('fails closed when the counters are unavailable', async () => {
    const { deps, sent } = setup();
    deps.rateLimit = async () => {
      throw new Error('db down');
    };
    expect((await handleSendSms(await signed(payload), deps)).status).toBe(503);
    expect(sent).toHaveLength(0);
  });

  it('reads the admin setting, falling back field by field', () => {
    expect(guardFrom(null)).toEqual(DEFAULT_GUARD);
    expect(
      guardFrom({ allowed_prefixes: ['49', 'x', '0'], global_hour: 5, per_number_day: -1 }),
    ).toEqual({
      ...DEFAULT_GUARD,
      allowedPrefixes: ['49'],
      globalHour: 5,
    });
  });

  it('hashes numbers with the secret', async () => {
    const a = await hmacPhone('s1', '+49123', subtle);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await hmacPhone('s1', '+49123', subtle)).toBe(a);
    expect(await hmacPhone('s2', '+49123', subtle)).not.toBe(a);
  });
});
