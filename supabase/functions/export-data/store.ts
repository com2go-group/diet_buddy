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
