import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/** The caller's user ID from their access token, verified with the auth server. */
export async function userIdFromRequest(
  admin: SupabaseClient,
  req: Request,
): Promise<string | null> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  return data.user?.id ?? null;
}
