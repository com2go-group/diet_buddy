import {
  activeFromSubscriber,
  handleSyncPremium,
  type SyncDeps,
} from '../../functions/sync-premium/handler';

const USER = '11111111-1111-4111-8111-111111111111';
const NOW = new Date('2026-09-29T12:00:00Z');

const post = () => new Request('http://localhost/sync-premium', { method: 'POST' });

function deps(body: unknown, status = 200): SyncDeps & { calls: [string, boolean][] } {
  const calls: [string, boolean][] = [];
  return {
    calls,
    getUserId: async () => USER,
    secretKey: 'sk_test',
    now: () => NOW,
    fetch: jest.fn(async () => new Response(JSON.stringify(body), { status })) as typeof fetch,
    applyPremium: async (id, premium) => (calls.push([id, premium]), true),
  };
}

const subscriber = (expires: string | null | undefined) => ({
  subscriber: {
    entitlements: expires === undefined ? {} : { premium: { expires_date: expires } },
  },
});

describe('sync-premium', () => {
  it('reads the entitlement from RevenueCat', () => {
    expect(activeFromSubscriber(subscriber('2026-10-06T12:00:00Z'), NOW)).toBe(true);
    expect(activeFromSubscriber(subscriber('2026-09-28T12:00:00Z'), NOW)).toBe(false);
    expect(activeFromSubscriber(subscriber(null), NOW)).toBe(true);
    expect(activeFromSubscriber(subscriber(undefined), NOW)).toBe(false);
    expect(activeFromSubscriber({ nope: 1 }, NOW)).toBeNull();
  });

  it('applies an active subscription right away', async () => {
    const d = deps(subscriber('2026-10-06T12:00:00Z'));
    const res = await handleSyncPremium(post(), d);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ premium: true });
    expect(d.calls).toEqual([[USER, true]]);
    expect(d.fetch).toHaveBeenCalledWith(
      `https://api.revenuecat.com/v1/subscribers/${USER}`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer sk_test' }),
      }),
    );
  });

  it('applies an expired one as not premium', async () => {
    const d = deps(subscriber('2026-09-01T00:00:00Z'));
    await handleSyncPremium(post(), d);
    expect(d.calls).toEqual([[USER, false]]);
  });

  it('needs a signed-in user and the secret key', async () => {
    const d = deps(subscriber(null));
    expect((await handleSyncPremium(post(), { ...d, getUserId: async () => null })).status).toBe(
      401,
    );
    expect((await handleSyncPremium(post(), { ...d, secretKey: undefined })).status).toBe(503);
    expect(d.calls).toEqual([]);
  });

  it('changes nothing when RevenueCat is unavailable', async () => {
    const d = deps({ error: 'x' }, 500);
    expect((await handleSyncPremium(post(), d)).status).toBe(502);
    expect(d.calls).toEqual([]);
  });
});
