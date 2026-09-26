import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

import type { DispatchStore } from './handler.ts';

function must<T>(r: { data: T; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}

/** Rows from an untyped query, typed by the caller. */
function rows<R>(r: { data: unknown; error: { message: string } | null }): R[] {
  return (must(r) ?? []) as R[];
}

/** DispatchStore on a service-role client. */
export function supabasePushStore(db: SupabaseClient): DispatchStore {
  return {
    async pending(limit) {
      return rows(
        await db
          .from('notifications')
          .select('id, user_id, type, title, body')
          .is('pushed_at', null)
          .gte('created_at', new Date(Date.now() - 86_400_000).toISOString())
          .order('created_at')
          .limit(limit),
      );
    },
    async tokens(userIds) {
      return rows(await db.from('push_tokens').select('user_id, token').in('user_id', userIds));
    },
    async preferences(userIds) {
      return rows(
        await db
          .from('notification_preferences')
          .select('user_id, streaks, achievements, weekly_report, promotions')
          .in('user_id', userIds),
      );
    },
    async marketingConsent(userIds) {
      const granted = rows<{ user_id: string }>(
        await db
          .from('consents')
          .select('user_id')
          .eq('consent_type', 'marketing')
          .eq('granted', true)
          .in('user_id', userIds),
      );
      return granted.map((r) => r.user_id);
    },
    async markPushed(ids) {
      must(
        await db
          .from('notifications')
          .update({ pushed_at: new Date().toISOString() })
          .in('id', ids),
      );
    },
    async removeTokens(tokens) {
      must(await db.from('push_tokens').delete().in('token', tokens));
    },
  };
}
