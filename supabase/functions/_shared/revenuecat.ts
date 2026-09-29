import { z } from 'npm:zod@4';

import { activeFromSubscriber, PREMIUM_ENTITLEMENT } from '../sync-premium/handler.ts';

/** RevenueCat's promotional durations. */
export const GRANT_DURATIONS = ['weekly', 'monthly', 'three_month', 'yearly', 'lifetime'] as const;
export type GrantDuration = (typeof GRANT_DURATIONS)[number];

const subscriberExpiry = z.object({
  subscriber: z.object({
    entitlements: z.record(z.string(), z.object({ expires_date: z.string().nullish() })),
  }),
});

export class RevenueCatError extends Error {
  constructor(public readonly status: number) {
    super(`revenuecat ${status}`);
    this.name = 'RevenueCatError';
  }
}

/**
 * Grants (duration) or revokes (null) a promotional `premium` entitlement with RevenueCat's
 * secret key and returns whether the user is Premium afterwards (paid or promotional) and when
 * it ends. Throws RevenueCatError when RevenueCat can't be reached or answers oddly.
 */
export async function promotionalPremium(opts: {
  key: string;
  userId: string;
  duration: GrantDuration | null;
  now: Date;
  fetch?: typeof fetch;
}): Promise<{ premium: boolean; expiresAt: string | null }> {
  const base = `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(opts.userId)}/entitlements/${PREMIUM_ENTITLEMENT}`;
  const res = await (opts.fetch ?? fetch)(
    opts.duration ? `${base}/promotional` : `${base}/revoke_promotionals`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${opts.key}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: opts.duration ? JSON.stringify({ duration: opts.duration }) : undefined,
    },
  );
  if (!res.ok) throw new RevenueCatError(res.status);
  const body: unknown = await res.json().catch(() => null);
  const premium = activeFromSubscriber(body, opts.now);
  if (premium === null) throw new RevenueCatError(res.status);
  const parsed = subscriberExpiry.safeParse(body);
  const expiresAt = parsed.success
    ? (parsed.data.subscriber.entitlements[PREMIUM_ENTITLEMENT]?.expires_date ?? null)
    : null;
  return { premium, expiresAt };
}
