import { fail, json } from '../_shared/http.ts';
import { RevenueCatError, type GrantDuration } from '../_shared/revenuecat.ts';

/**
 * Rewards invites (decision log 2026-09-30): for each invite whose new user finished onboarding
 * and logged food on enough days (`referral_candidates`), both people get a month of Premium as
 * a RevenueCat promotional entitlement, applied to `is_premium` at once, plus an in-app
 * notification. Run by pg_cron with the CRON_SECRET bearer token (docs/backend.md → Referrals).
 * An invite is claimed ('rewarding') before anything is granted, so two runs never reward it
 * twice; if RevenueCat fails it goes back to 'pending' for the next run.
 */

export const REWARD: GrantDuration = 'monthly';
export const BATCH = 50;

export interface Candidate {
  id: string;
  referrer_id: string;
  referred_id: string;
}

export interface ReferralStore {
  candidates(limit: number): Promise<Candidate[]>;
  /** pending → rewarding; false when another run took it. */
  claim(id: string): Promise<boolean>;
  finish(id: string, rewarded: boolean): Promise<void>;
  applyPremium(userId: string, premium: boolean, at: Date): Promise<void>;
  notify(userId: string, kind: 'referrer' | 'referred'): Promise<void>;
}

export interface ReferralDeps {
  secret: string | undefined;
  store: ReferralStore;
  /** RevenueCat promotional grant; null when REVENUECAT_SECRET_KEY isn't set. */
  grant:
    ((userId: string, duration: GrantDuration, now: Date) => Promise<{ premium: boolean }>) | null;
  now?: () => Date;
}

export async function handleReferralRewards(req: Request, deps: ReferralDeps): Promise<Response> {
  if (req.method !== 'POST') return fail('method_not_allowed', 405);
  if (!deps.secret || req.headers.get('Authorization') !== `Bearer ${deps.secret}`) {
    return fail('unauthorized', 401);
  }
  if (!deps.grant) return json({ ok: true, configured: false });
  try {
    const now = deps.now?.() ?? new Date();
    let rewarded = 0;
    let failed = 0;
    for (const c of await deps.store.candidates(BATCH)) {
      if (!(await deps.store.claim(c.id))) continue;
      try {
        // The new user first: they are the one who is waiting for it.
        for (const [userId, kind] of [
          [c.referred_id, 'referred'],
          [c.referrer_id, 'referrer'],
        ] as const) {
          const result = await deps.grant(userId, REWARD, now);
          await deps.store.applyPremium(userId, result.premium, now);
          await deps.store.notify(userId, kind);
        }
        await deps.store.finish(c.id, true);
        rewarded++;
      } catch (e) {
        failed++;
        console.error(
          'referral-rewards: grant failed',
          e instanceof RevenueCatError ? e.status : e,
        );
        await deps.store.finish(c.id, false);
      }
    }
    return json({ ok: true, rewarded, failed });
  } catch (e) {
    console.error('referral-rewards failed', e);
    return fail('server_error', 500);
  }
}
