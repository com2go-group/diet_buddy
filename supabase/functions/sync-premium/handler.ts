import { z } from 'npm:zod@4';

import { corsHeaders, fail, json } from '../_shared/http.ts';

/**
 * Right after a purchase or restore the app asks for its premium status to be checked now,
 * instead of waiting for RevenueCat's webhook (a few seconds). The status still comes from
 * RevenueCat, never from the app (CLAUDE.md §12): we read the caller's subscriber record with the
 * secret REST API key and apply it with the same database function as the webhook.
 */

export const PREMIUM_ENTITLEMENT = 'premium';

const subscriberSchema = z.object({
  subscriber: z.object({
    entitlements: z.record(z.string(), z.object({ expires_date: z.string().nullish() })),
  }),
});

export interface SyncDeps {
  getUserId(req: Request): Promise<string | null>;
  /** RevenueCat's secret API key (`sk_…`); unset → not configured. */
  secretKey: string | undefined;
  fetch: typeof fetch;
  applyPremium(userId: string, premium: boolean, at: Date): Promise<boolean>;
  now?: () => Date;
}

/** Whether RevenueCat's subscriber record has an active `premium` entitlement. */
export function activeFromSubscriber(body: unknown, now: Date): boolean | null {
  const parsed = subscriberSchema.safeParse(body);
  if (!parsed.success) return null;
  const premium = parsed.data.subscriber.entitlements[PREMIUM_ENTITLEMENT];
  if (!premium) return false;
  return premium.expires_date == null || new Date(premium.expires_date).getTime() > now.getTime();
}

export async function handleSyncPremium(req: Request, deps: SyncDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return fail('method_not_allowed', 405);
  if (!deps.secretKey) return fail('not_configured', 503);
  try {
    const userId = await deps.getUserId(req);
    if (!userId) return fail('unauthorized', 401);
    const res = await deps.fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
      { headers: { Authorization: `Bearer ${deps.secretKey}`, Accept: 'application/json' } },
    );
    if (!res.ok) {
      console.error('sync-premium: RevenueCat answered', res.status);
      return fail('store_unavailable', 502);
    }
    const now = deps.now?.() ?? new Date();
    const premium = activeFromSubscriber(await res.json().catch(() => null), now);
    if (premium === null) return fail('store_unavailable', 502);
    await deps.applyPremium(userId, premium, now);
    return json({ premium });
  } catch (e) {
    console.error('sync-premium failed', e);
    return fail('server_error', 500);
  }
}
