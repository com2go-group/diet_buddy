import { useSessionStore } from '../auth/sessionStore';
import { useProfile } from './useProfile';

export type AppRoute = 'welcome' | 'new-password' | 'onboarding' | 'home' | 'loading' | 'error';

/**
 * Where the user belongs right now. Route guards and the index redirect both use this, so they
 * can never disagree.
 */
export function useAppRoute(): { route: AppRoute; retry: () => void } {
  const { session, recovering } = useSessionStore();
  const profile = useProfile();
  const retry = () => void profile.refetch();
  if (!session) return { route: 'welcome', retry };
  if (recovering) return { route: 'new-password', retry };
  if (profile.isPending) return { route: 'loading', retry };
  if (profile.isError) return { route: 'error', retry };
  return { route: profile.data.onboarding_completed_at ? 'home' : 'onboarding', retry };
}
