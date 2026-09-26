import { useSessionStore } from '../auth/sessionStore';
import { useProfile } from './useProfile';

export type AppRoute =
  | 'welcome'
  | 'new-password'
  | 'onboarding'
  | 'body-scan'
  | 'initial-plan'
  | 'home'
  | 'loading'
  | 'error';

/** Screens in the onboarding flow: questions, then body scan, then the initial plan. */
export const ONBOARDING_ROUTES: readonly AppRoute[] = ['onboarding', 'body-scan', 'initial-plan'];

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
  const { onboarding_completed_at: completed, onboarding_step: step } = profile.data;
  if (completed) return { route: 'home', retry };
  if (step === 'bodyScan') return { route: 'body-scan', retry };
  if (step === 'initialPlan') return { route: 'initial-plan', retry };
  return { route: 'onboarding', retry };
}
