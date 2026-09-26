import { webcrypto } from 'node:crypto';

import { signPayload, verifyWebhook } from '../../functions/_shared/standardWebhooks';
import {
  handleSendSms,
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

function setup(provider = 'smsto') {
  const sent: [string, string, string][] = [];
  const deps: SendSmsDeps = {
    secret: SECRET,
    now: () => NOW,
    settings: async () => ({ provider, senderId: 'DietBuddy' }),
    providers: { smsto: { send: async (to, msg, sender) => void sent.push([to, msg, sender]) } },
  };
  return { deps, sent };
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
