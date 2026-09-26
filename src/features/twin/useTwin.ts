import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { haptics } from '@/lib/haptics';

import { useSessionStore } from '../auth/sessionStore';
import { loadTwin, saveLook, type TwinData } from './api';
import type { TwinLook } from './twin';

/** Under 'progress' so check-ins, body checks and health syncs refresh the twin too. */
export const twinKey = (userId: string | undefined) => ['progress', 'twin', userId];

export function useTwin() {
  const userId = useSessionStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const key = twinKey(userId);
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(userId),
    queryFn: () => loadTwin(userId!),
  });
  const look = useMutation({
    mutationFn: (next: TwinLook) => saveLook(userId!, next),
    onSuccess: (_r, next) => {
      haptics.success();
      queryClient.setQueryData<TwinData>(key, (d) => (d ? { ...d, look: next } : d));
    },
  });
  return { query, look };
}
