import { optional, required, supabase } from '@/lib/supabase';

export type RedeemResult = 'ok' | 'invalid' | 'own' | 'already' | 'too_late' | 'limit';

export interface InviteData {
  code: string;
  /** Friends who joined with this user's code, and how many earned the reward. */
  joined: number;
  rewarded: number;
  /** Whether this user entered a friend's code, and its state. */
  referredStatus: 'pending' | 'rewarding' | 'rewarded' | 'expired' | null;
  /** Account age, for the "Got a code?" window. */
  signedUpAt: string | null;
}

export async function loadInvite(userId: string): Promise<InviteData> {
  const [code, rows, user] = await Promise.all([
    supabase.rpc('my_referral_code'),
    supabase.from('referrals').select('referrer_id, referred_id, status'),
    supabase.auth.getUser(),
  ]);
  const referrals = optional(rows) ?? [];
  const mine = referrals.filter((r) => r.referrer_id === userId);
  return {
    code: required(code),
    joined: mine.filter((r) => r.status !== 'expired').length,
    rewarded: mine.filter((r) => r.status === 'rewarded').length,
    referredStatus:
      (referrals.find((r) => r.referred_id === userId)?.status as InviteData['referredStatus']) ??
      null,
    signedUpAt: user.data.user?.created_at ?? null,
  };
}

export async function redeemCode(code: string): Promise<RedeemResult> {
  return required(await supabase.rpc('redeem_referral', { p_code: code })) as RedeemResult;
}

/** Days after sign-up in which a friend's code can be entered (server: referral_redeem_days). */
export const REDEEM_DAYS = 14;

export function canRedeem(data: InviteData, now: Date): boolean {
  if (data.referredStatus !== null || !data.signedUpAt) return false;
  return now.getTime() - Date.parse(data.signedUpAt) < REDEEM_DAYS * 86_400_000;
}
