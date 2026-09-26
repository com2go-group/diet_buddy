import {
  handleRevenueCatWebhook,
  premiumAfter,
  type WebhookDeps,
} from '../../functions/revenuecat-webhook/handler';

const USER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-09-27T12:00:00Z');
const DAY = 86_400_000;

const post = (event: Record<string, unknown>, auth = 'Bearer s3cret') =>
  new Request('http://localhost/revenuecat-webhook', {
    method: 'POST',
    headers: { Authorization: auth },
    body: JSON.stringify({ event: { event_timestamp_ms: NOW.getTime(), ...event } }),
  });

function deps(): WebhookDeps & { calls: [string, boolean][] } {
  const calls: [string, boolean][] = [];
  return {
    calls,
    secret: 'Bearer s3cret',
    now: () => NOW,
    applyPremium: async (id, premium) => (calls.push([id, premium]), true),
  };
}

describe('revenuecat-webhook', () => {
  it('rejects requests without the shared secret', async () => {
    const d = deps();
    const res = await handleRevenueCatWebhook(
      post({ type: 'INITIAL_PURCHASE' }, 'Bearer wrong'),
      d,
    );
    expect(res.status).toBe(401);
    expect(d.calls).toEqual([]);
  });

  it('grants premium on purchase and renewal', async () => {
    const d = deps();
    await handleRevenueCatWebhook(
      post({
        type: 'INITIAL_PURCHASE',
        app_user_id: USER,
        entitlement_ids: ['premium'],
        expiration_at_ms: NOW.getTime() + 30 * DAY,
      }),
      d,
    );
    expect(d.calls).toEqual([[USER, true]]);
  });

  it('keeps premium after cancellation until expiry, then removes it', () => {
    const base = {
      event_timestamp_ms: NOW.getTime(),
      app_user_id: USER,
      entitlement_ids: ['premium'],
    };
    expect(
      premiumAfter({ ...base, type: 'CANCELLATION', expiration_at_ms: NOW.getTime() + DAY }, NOW),
    ).toBe(true);
    expect(
      premiumAfter({ ...base, type: 'EXPIRATION', expiration_at_ms: NOW.getTime() - DAY }, NOW),
    ).toBe(false);
    expect(
      premiumAfter({ ...base, type: 'NON_RENEWING_PURCHASE', expiration_at_ms: null }, NOW),
    ).toBe(true);
    expect(
      premiumAfter({ ...base, type: 'INITIAL_PURCHASE', entitlement_ids: ['other'] }, NOW),
    ).toBe(false);
  });

  it('moves premium on transfer and ignores anonymous IDs', async () => {
    const d = deps();
    await handleRevenueCatWebhook(
      post({
        type: 'TRANSFER',
        transferred_from: [OTHER, '$RCAnonymousID:abc'],
        transferred_to: [USER],
      }),
      d,
    );
    expect(d.calls).toEqual([
      [OTHER, false],
      [USER, true],
    ]);
  });

  it('acknowledges test events and rejects malformed ones', async () => {
    expect(await (await handleRevenueCatWebhook(post({ type: 'TEST' }), deps())).json()).toEqual({
      ok: true,
      applied: 0,
    });
    const bad = new Request('http://localhost', {
      method: 'POST',
      headers: { Authorization: 'Bearer s3cret' },
      body: '{}',
    });
    expect((await handleRevenueCatWebhook(bad, deps())).status).toBe(400);
  });

  it('asks RevenueCat to retry when the database fails', async () => {
    const d = deps();
    d.applyPremium = async () => {
      throw new Error('db down');
    };
    const res = await handleRevenueCatWebhook(
      post({ type: 'RENEWAL', app_user_id: USER, entitlement_ids: ['premium'] }),
      d,
    );
    expect(res.status).toBe(500);
  });
});
