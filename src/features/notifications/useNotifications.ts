import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSessionStore } from '../auth/sessionStore';
import { loadNotifications, markAllRead } from './api';

export function useNotifications() {
  const userId = useSessionStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const key = ['notifications', userId] as const;
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(userId),
    queryFn: () => loadNotifications(userId!),
  });
  const readAll = useMutation({
    mutationFn: () => markAllRead(userId!),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  const unread = (query.data ?? []).filter((n) => !n.read_at).length;
  return { query, unread, markAllRead: () => readAll.mutate() };
}
