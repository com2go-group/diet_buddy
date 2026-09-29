import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

import type { ExportStore } from './handler.ts';

export const PHOTO_BUCKET = 'progress-photos';

/** Reads with the service role, always filtered by user_id. */
export function supabaseExportStore(db: SupabaseClient): ExportStore {
  return {
    async account(userId) {
      const { data, error } = await db.auth.admin.getUserById(userId);
      if (error || !data.user) throw new Error(error?.message ?? 'user not found');
      const u = data.user;
      return { id: u.id, email: u.email ?? null, phone: u.phone ?? null, created_at: u.created_at };
    },
    async rows(table, userId) {
      if (table === 'referrals') {
        // The user's side of each invite; the other person's ID is left out (their data).
        const { data, error } = await db
          .from('referrals')
          .select('referrer_id, referred_id, status, rewarded_at, created_at')
          .or(`referrer_id.eq.${userId},referred_id.eq.${userId}`);
        if (error) throw new Error(`referrals: ${error.message}`);
        return (data ?? []).map((r: Record<string, unknown>) => ({
          role: r.referrer_id === userId ? 'invited_a_friend' : 'joined_with_a_code',
          status: r.status,
          rewarded_at: r.rewarded_at,
          created_at: r.created_at,
        }));
      }
      const { data, error } = await db.from(table).select('*').eq('user_id', userId).limit(100_000);
      if (error) throw new Error(`${table}: ${error.message}`);
      return (data ?? []) as Record<string, unknown>[];
    },
    async files(userId) {
      const { data, error } = await db.storage.from(PHOTO_BUCKET).list(userId, { limit: 1000 });
      if (error) throw new Error(error.message);
      return (data ?? []).map((f) => `${userId}/${f.name}`);
    },
  };
}

/** Deletes every file in the user's private photo folder; returns how many were removed. */
export async function removeUserFiles(db: SupabaseClient, userId: string): Promise<number> {
  let removed = 0;
  for (;;) {
    const { data, error } = await db.storage.from(PHOTO_BUCKET).list(userId, { limit: 100 });
    if (error) throw new Error(error.message);
    if (!data?.length) return removed;
    const { error: removeError } = await db.storage
      .from(PHOTO_BUCKET)
      .remove(data.map((f) => `${userId}/${f.name}`));
    if (removeError) throw new Error(removeError.message);
    removed += data.length;
  }
}
