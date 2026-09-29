import { RevenueCatError } from '../../functions/_shared/revenuecat';
import {
  handleReferralRewards,
  type ReferralDeps,
  type ReferralStore,
} from '../../functions/referral-rewards/handler';

const post = (auth = 'Bearer cron') =>
  new Request('http://x', { method: 'POST', headers: { Authorization: auth } });

function setup(opts: { claimed?: Set<string>; failFor?: string } = {}) {
  const log: string[] = [];
  const store: ReferralStore = {
    candidates: async () => [
      { id: 'r1', referrer_id: 'friend', referred_id: 'new' },
      { id: 'r2', referrer_id: 'friend', referred_id: 'other' },
    ],
    claim: async (id) => !(opts.claimed?.has(id) ?? false),
    finish: async (id, ok) => void log.push(`finish ${id} ${ok}`),
    applyPremium: async (u, p) => void log.push(`premium ${u} ${p}`),
    notify: async (u, kind) => void log.push(`notify ${u} ${kind}`),
  };
  const grant = jest.fn(async (userId: string) => {
    if (userId === opts.failFor) throw new RevenueCatError(500);
    return { premium: true };
  });
  const deps: ReferralDeps = { secret: 'cron', store, grant, now: () => new Date() };
  return { deps, log, grant };
}

describe('referral-rewards', () => {
  it('needs the cron secret and RevenueCat', async () => {
    const { deps } = setup();
    expect((await handleReferralRewards(post('Bearer x'), deps)).status).toBe(401);
    const res = await handleReferralRewards(post(), { ...deps, grant: null });
    expect(await res.json()).toEqual({ ok: true, configured: false });
  });

  it('gives both people a month of Premium and tells them', async () => {
    const { deps, log, grant } = setup();
    const body = await (await handleReferralRewards(post(), deps)).json();
    expect(body).toEqual({ ok: true, rewarded: 2, failed: 0 });
    expect(grant).toHaveBeenCalledWith('new', 'monthly', expect.any(Date));
    expect(log.slice(0, 5)).toEqual([
      'premium new true',
      'notify new referred',
      'premium friend true',
      'notify friend referrer',
      'finish r1 true',
    ]);
  });

  it('skips invites another run claimed and retries failed ones later', async () => {
    const { deps, log } = setup({ claimed: new Set(['r1']), failFor: 'other' });
    const body = await (await handleReferralRewards(post(), deps)).json();
    expect(body).toEqual({ ok: true, rewarded: 0, failed: 1 });
    expect(log).toEqual(['finish r2 false']);
  });
});
