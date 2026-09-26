import { z } from 'npm:zod@4';

import { corsHeaders, fail, json } from '../_shared/http.ts';

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
  audit(adminId: string, action: string, target: string): Promise<void>;
}

const bodySchema = z.object({
  action: z.enum(['export', 'delete', 'ban', 'unban']),
  userId: z.string().uuid(),
  /** Deletion needs the target's ID typed again, like the in-app DELETE confirmation. */
  confirm: z.string().optional(),
});

/**
 * POST { action, userId } → admin actions that need the service role: GDPR export, account
 * deletion (files, then the auth user; every table cascades), ban and unban. Admins and owners
 * only, two-factor session required, never on yourself, and staff accounts only by an owner.
 * Every action is written to the audit log first.
 */
export async function handleAdminUsers(req: Request, deps: AdminUsersDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return fail('method_not_allowed', 405);
  try {
    const admin = await deps.getAdmin(req);
    if (!admin || RANK[admin.role] < RANK.admin) return fail('forbidden', 403);
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return fail('invalid_request', 400);
    const { action, userId, confirm } = parsed.data;
    if (userId === admin.userId) return fail('not_on_yourself', 400);
    const targetRole = await deps.roleOf(userId);
    if (targetRole && admin.role !== 'owner') return fail('forbidden', 403);
    if (action === 'delete' && confirm !== userId) return fail('confirmation_required', 400);

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
