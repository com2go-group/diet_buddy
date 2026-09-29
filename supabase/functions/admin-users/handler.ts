import { z } from 'npm:zod@4';

import { corsHeaders, fail, json } from '../_shared/http.ts';
import { activeFromSubscriber, PREMIUM_ENTITLEMENT } from '../sync-premium/handler.ts';

export type AdminRole = 'support' | 'admin' | 'owner';
const RANK: Record<AdminRole, number> = { support: 1, admin: 2, owner: 3 };

export interface AdminUsersDeps {
  /** The caller's admin role, only when their session passed two-factor sign-in. */
  getAdmin(req: Request): Promise<{ userId: string; role: AdminRole } | null>;
  /** The target's admin role, if they are staff. */
  roleOf(userId: string): Promise<AdminRole | null>;
  exportUser(userId: string): Promise<unknown>;
  removeFiles(userId: string): Promise<number>;
  deleteUser(userId: string): Promise<void>;
  setBanned(userId: string, banned: boolean): Promise<void>;
  audit(
    adminId: string,
    action: string,
    target: string,
    details?: Record<string, unknown>,
  ): Promise<void>;
  /** RevenueCat's secret API key (`sk_…`) for Premium grants; unset → not configured. */
  revenueCatKey?: string;
  fetch?: typeof fetch;
  /** Same database function as the webhook (`apply_premium_event`). */
  applyPremium?(userId: string, premium: boolean, at: Date): Promise<boolean>;
  now?: () => Date;
}

/** RevenueCat's promotional durations offered in the dashboard. */
export const GRANT_DURATIONS = ['weekly', 'monthly', 'three_month', 'yearly', 'lifetime'] as const;
export type GrantDuration = (typeof GRANT_DURATIONS)[number];

const bodySchema = z.object({
  action: z.enum(['export', 'delete', 'ban', 'unban', 'grant_premium', 'revoke_premium']),
  userId: z.string().uuid(),
  /** Deletion needs the target's ID typed again, like the in-app DELETE confirmation. */
  confirm: z.string().optional(),
  duration: z.enum(GRANT_DURATIONS).optional(),
  /** Why Premium was given or taken back (kept in the audit log). */
  reason: z.string().trim().max(200).optional(),
});

const subscriberExpiry = z.object({
  subscriber: z.object({
    entitlements: z.record(z.string(), z.object({ expires_date: z.string().nullish() })),
  }),
});

/**
 * Grants (or revokes) a RevenueCat promotional `premium` entitlement, so Premium given by an
 * admin works like a purchase: on every device, ending by itself. The result is applied to
 * `profiles.is_premium` at once, from RevenueCat's answer (a user who also pays stays Premium
 * after a revoke).
 */
async function promotional(
  deps: AdminUsersDeps,
  userId: string,
  duration: GrantDuration | null,
): Promise<Response | { premium: boolean; expiresAt: string | null }> {
  if (!deps.revenueCatKey || !deps.applyPremium) return fail('not_configured', 503);
  const base = `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}/entitlements/${PREMIUM_ENTITLEMENT}`;
  const res = await (deps.fetch ?? fetch)(
    duration ? `${base}/promotional` : `${base}/revoke_promotionals`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${deps.revenueCatKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: duration ? JSON.stringify({ duration }) : undefined,
    },
  );
  if (!res.ok) {
    console.error('admin-users: RevenueCat answered', res.status);
    return fail('store_unavailable', 502);
  }
  const body: unknown = await res.json().catch(() => null);
  const now = deps.now?.() ?? new Date();
  const premium = activeFromSubscriber(body, now);
  if (premium === null) return fail('store_unavailable', 502);
  await deps.applyPremium(userId, premium, now);
  const parsed = subscriberExpiry.safeParse(body);
  const expiresAt = parsed.success
    ? (parsed.data.subscriber.entitlements[PREMIUM_ENTITLEMENT]?.expires_date ?? null)
    : null;
  return { premium, expiresAt };
}

/**
 * POST { action, userId } → admin actions that need the service role: GDPR export, account
 * deletion (files, then the auth user; every table cascades), ban and unban, and Premium given
 * or taken back through RevenueCat (`duration` and a `reason` required to grant). Admins and
 * owners only, two-factor session required, never on yourself, and staff accounts only by an
 * owner. Every action is written to the audit log first; a Premium change once RevenueCat has
 * answered, with its outcome.
 */
export async function handleAdminUsers(req: Request, deps: AdminUsersDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return fail('method_not_allowed', 405);
  try {
    const admin = await deps.getAdmin(req);
    if (!admin || RANK[admin.role] < RANK.admin) return fail('forbidden', 403);
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail('invalid_request', 400);
    const { action, userId, confirm, duration, reason } = parsed.data;
    if (userId === admin.userId) return fail('not_on_yourself', 400);
    const targetRole = await deps.roleOf(userId);
    if (targetRole && admin.role !== 'owner') return fail('forbidden', 403);
    if (action === 'delete' && confirm !== userId) return fail('confirmation_required', 400);
    const premiumAction = action === 'grant_premium' || action === 'revoke_premium';
    if (premiumAction && (!reason || reason.length < 3)) return fail('reason_required', 400);
    if (action === 'grant_premium' && !duration) return fail('invalid_request', 400);

    if (premiumAction) {
      // Logged once RevenueCat has answered, with the outcome (nothing changes on a failure).
      const result = await promotional(deps, userId, action === 'grant_premium' ? duration! : null);
      if (result instanceof Response) return result;
      await deps.audit(admin.userId, action, userId, {
        reason,
        ...(duration ? { duration } : {}),
        premium: result.premium,
        expires_at: result.expiresAt,
      });
      return json(result);
    }

    await deps.audit(admin.userId, `user_${action}`, userId);
    switch (action) {
      case 'export':
        return json({ export: await deps.exportUser(userId) }, 200, {
          'Cache-Control': 'no-store',
        });
      case 'delete': {
        const files = await deps.removeFiles(userId);
        await deps.deleteUser(userId);
        return json({ deleted: true, files });
      }
      case 'ban':
      case 'unban':
        await deps.setBanned(userId, action === 'ban');
        return json({ banned: action === 'ban' });
    }
  } catch (e) {
    console.error('admin-users failed', e);
    return fail('server_error', 500);
  }
}
