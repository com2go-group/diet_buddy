import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { haptics } from '@/lib/haptics';

import { useSessionStore } from '../auth/sessionStore';
import { CoachError, loadThread, sendMessage, type CoachThread, type Persona } from './api';

export const coachQueryKey = (userId: string | undefined, persona: Persona) =>
  ['coach', userId, persona] as const;

/**
 * A persona's thread. `fresh` starts a new conversation (the old one stays stored); the server
 * owns the daily limit, so the count here is only for display.
 */
export function useCoach(persona: Persona) {
  const userId = useSessionStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const key = coachQueryKey(userId, persona);
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(userId),
    queryFn: () => loadThread(userId!, persona),
  });

  const send = useMutation({
    mutationFn: (text: string) => sendMessage(persona, text, query.data?.conversationId ?? null),
    onSuccess: (result) => {
      haptics.selection();
      queryClient.setQueryData<CoachThread>(key, (old) =>
        old
          ? {
              ...old,
              conversationId: result.conversationId,
              messages: [...old.messages, ...result.messages],
              usedToday: old.usedToday + 1,
            }
          : old,
      );
    },
    onError: (error) => {
      if (error instanceof CoachError && error.code === 'limit_reached') {
        queryClient.setQueryData<CoachThread>(key, (old) =>
          old ? { ...old, usedToday: old.limit } : old,
        );
      }
    },
  });

  const startFresh = () => {
    send.reset();
    queryClient.setQueryData<CoachThread>(key, (old) =>
      old ? { ...old, conversationId: null, messages: [] } : old,
    );
  };

  return { query, send, startFresh };
}
