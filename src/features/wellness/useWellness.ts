import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSessionStore } from '../auth/sessionStore';
import { setConsent } from '../profile/api';
import { deleteWellness, fetchWellness } from './api';

export function useWellness(enabled: boolean) {
  const userId = useSessionStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const key = ['wellness', userId];
  const query = useQuery({
    queryKey: key,
    enabled: enabled && Boolean(userId),
    queryFn: () => fetchWellness(new Date()),
    retry: false,
  });
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: key }),
      queryClient.invalidateQueries({ queryKey: ['consents'] }),
    ]);
  const allow = useMutation({
    mutationFn: () => setConsent('coach_insights', true),
    onSettled: refresh,
  });
  // After deleting, nothing is fetched again until the user asks (a fetch would make a new set).
  const erase = useMutation({
    mutationFn: () => deleteWellness(userId!),
    onSuccess: () => queryClient.removeQueries({ queryKey: key }),
  });
  return { query, allow, erase };
}
