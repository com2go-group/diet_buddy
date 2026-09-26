import { useQuery } from '@tanstack/react-query';

import { useSessionStore } from '../auth/sessionStore';
import { loadStory } from './api';

/** Under 'progress' so new logs and weigh-ins refresh the story too. */
export function useStory(now: Date) {
  const userId = useSessionStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['progress', 'story', userId],
    enabled: Boolean(userId),
    queryFn: () => loadStory(userId!, now),
  });
}
