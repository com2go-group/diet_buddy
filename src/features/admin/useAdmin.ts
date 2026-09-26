import { useQuery } from '@tanstack/react-query';

import { useSessionStore } from '../auth/sessionStore';
import { adminMe } from './api';

export const adminMeKey = (userId: string | undefined) => ['adminMe', userId] as const;

/** The signed-in user's admin role and whether this session passed two-factor sign-in. */
export function useAdmin() {
  const userId = useSessionStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: adminMeKey(userId),
    enabled: Boolean(userId),
    queryFn: adminMe,
    staleTime: 60_000,
  });
}
