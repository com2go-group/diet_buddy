import { z } from 'npm:zod@4';

import { corsHeaders, fail, json } from '../_shared/http.ts';

export interface DeleteDeps {
  getUserId(req: Request): Promise<string | null>;
  /** Removes the user's Storage files; returns how many were deleted. */
  removeFiles(userId: string): Promise<number>;
  /** Deletes the auth user; every table cascades from auth.users. */
  deleteUser(userId: string): Promise<void>;
}

const bodySchema = z.object({ confirm: z.literal('DELETE') });

/**
 * POST { confirm: "DELETE" } → permanently deletes the account and all its data at once
 * (CLAUDE.md §7.1, §13; the App Store requires in-app deletion).
 */
export async function handleDeleteAccount(req: Request, deps: DeleteDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return fail('method_not_allowed', 405);
  try {
    const userId = await deps.getUserId(req);
    if (!userId) return fail('unauthorized', 401);
    if (!bodySchema.safeParse(await req.json().catch(() => null)).success) {
      return fail('confirmation_required', 400);
    }
    // Files first: if this fails the account still exists and the user can retry.
    const files = await deps.removeFiles(userId);
    await deps.deleteUser(userId);
    return json({ deleted: true, files });
  } catch (e) {
    console.error('delete-account failed', e);
    return fail('server_error', 500);
  }
}
