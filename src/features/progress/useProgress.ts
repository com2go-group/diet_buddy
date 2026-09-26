import { useQuery } from '@tanstack/react-query';

import { useSessionStore } from '../auth/sessionStore';
import { loadProgress } from './api';

export function useProgress() {
  const userId = useSessionStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['progress', userId],
    enabled: Boolean(userId),
    queryFn: () => loadProgress(userId!, new Date()),
  });
}
