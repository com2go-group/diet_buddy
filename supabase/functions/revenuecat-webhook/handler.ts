import { z } from 'npm:zod@4';

import { fail, json } from '../_shared/http.ts';

/**
 * RevenueCat → premium status (CLAUDE.md §12: the backend trusts only this webhook).
 * RevenueCat sends the Authorization header configured in its dashboard; we compare it with
 * REVENUECAT_WEBHOOK_AUTH. App user IDs are Supabase user IDs (set with Purchases.logIn).
 */

export const PREMIUM_ENTITLEMENT = 'premium';

const eventSchema = z.object({
  event: z.object({
    type: z.string(),
    app_user_id: z.string().optional(),
    original_app_user_id: z.string().optional(),
    aliases: z.array(z.string()).optional(),
    entitlement_ids: z.array(z.string()).nullish(),
    expiration_at_ms: z.number().nullish(),
    event_timestamp_ms: z.number(),
    transferred_from: z.array(z.string()).optional(),
    transferred_to: z.array(z.string()).optional(),
  }),
});
type RcEvent = z.infer<typeof eventSchema>['event'];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface WebhookDeps {
  secret: string | undefined;
  /** Applies the status if the event is newer than the last one; false if ignored. */
  applyPremium(userId: string, premium: boolean, eventAt: Date): Promise<boolean>;
  now?: () => Date;
}

/** Constant-time string comparison. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Whether this event leaves the user entitled to premium. */
export function premiumAfter(event: RcEvent, now: Date): boolean {
  if (event.type === 'EXPIRATION') return false;
  if (!(event.entitlement_ids ?? []).includes(PREMIUM_ENTITLEMENT)) return false;
  // Lifetime purchases have no expiry; cancelled subscriptions stay premium until they expire.
  return event.expiration_at_ms == null || event.expiration_at_ms > now.getTime();
}

/** Our user IDs mentioned by the event (RevenueCat anonymous IDs are ignored). */
function userIds(event: RcEvent): string[] {
  const ids = [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])];
  return [...new Set(ids.filter((id): id is string => Boolean(id && UUID.test(id))))];
}

export async function handleRevenueCatWebhook(req: Request, deps: WebhookDeps): Promise<Response> {
  if (req.method !== 'POST') return fail('method_not_allowed', 405);
  if (!deps.secret) return fail('not_configured', 503);
  if (!safeEqual(req.headers.get('Authorization') ?? '', deps.secret))
    return fail('unauthorized', 401);

  const parsed = eventSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('invalid_event', 400);
  const event = parsed.data.event;
  const at = new Date(event.event_timestamp_ms);
  const now = deps.now?.() ?? new Date();

  try {
    if (event.type === 'TEST') return json({ ok: true, applied: 0 });
    let applied = 0;
    if (event.type === 'TRANSFER') {
      // The purchase moved between app users: the old owners lose it, the new ones get it.
      for (const id of (event.transferred_from ?? []).filter((x) => UUID.test(x))) {
        if (await deps.applyPremium(id, false, at)) applied++;
      }
      for (const id of (event.transferred_to ?? []).filter((x) => UUID.test(x))) {
        if (await deps.applyPremium(id, true, at)) applied++;
      }
      return json({ ok: true, applied });
    }
    const premium = premiumAfter(event, now);
    for (const id of userIds(event)) {
      if (await deps.applyPremium(id, premium, at)) applied++;
    }
    return json({ ok: true, applied, premium });
  } catch (e) {
    console.error('revenuecat-webhook failed', e);
    // 500 makes RevenueCat retry later.
    return fail('server_error', 500);
  }
}
