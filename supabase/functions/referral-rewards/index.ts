import { createClient } from 'jsr:@supabase/supabase-js@2';

import { promotionalPremium } from '../_shared/revenuecat.ts';
import { handleReferralRewards, type ReferralStore } from './handler.ts';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});
const key = Deno.env.get('REVENUECAT_SECRET_KEY') || undefined;

function must<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

// In-app notifications (English, like the other server notifications); push-dispatch sends them.
const TEXT = {
  referred: {
    title: '🎁 A month of Premium is yours',
    body: 'Thanks for joining through a friend. Enjoy Premium for the next month.',
  },
  referrer: {
    title: '🎁 Your friend joined: a month of Premium',
    body: 'Someone you invited is up and running, so you both get a month of Premium.',
  },
};

const store: ReferralStore = {
  async candidates(limit) {
    return (must(await db.rpc('referral_candidates', { p_limit: limit })) ?? []) as {
      id: string;
      referrer_id: string;
      referred_id: string;
    }[];
  },
  async claim(id) {
    const rows = must(
      await db
        .from('referrals')
        .update({ status: 'rewarding' })
        .eq('id', id)
        .eq('status', 'pending')
        .select('id'),
    ) as unknown[] | null;
    return Boolean(rows?.length);
  },
  async finish(id, rewarded) {
    must(
      await db
        .from('referrals')
        .update(
          rewarded
            ? { status: 'rewarded', rewarded_at: new Date().toISOString() }
            : { status: 'pending' },
        )
        .eq('id', id),
    );
  },
  async applyPremium(userId, premium, at) {
    must(
      await db.rpc('apply_premium_event', {
        target_user: userId,
        premium,
        event_at: at.toISOString(),
      }),
    );
  },
  async notify(userId, kind) {
    must(
      await db.from('notifications').insert({ user_id: userId, type: 'referral', ...TEXT[kind] }),
    );
  },
};

Deno.serve((req) =>
  handleReferralRewards(req, {
    secret: Deno.env.get('CRON_SECRET'),
    store,
    grant: key
      ? (userId, duration, now) => promotionalPremium({ key, userId, duration, now })
      : null,
  }),
);
