import { optional, supabase, type Tables } from '@/lib/supabase';

export type AppNotification = Pick<
  Tables<'notifications'>,
  'id' | 'type' | 'title' | 'body' | 'read_at' | 'created_at'
>;

export async function loadNotifications(userId: string): Promise<AppNotification[]> {
  const result = await supabase
    .from('notifications')
    .select('id, type, title, body, read_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  return optional(result) ?? [];
}

export async function markAllRead(userId: string): Promise<void> {
  optional(
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null),
  );
}
