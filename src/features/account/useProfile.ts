import { useQuery } from '@tanstack/react-query';

import { required, supabase } from '@/lib/supabase';

import { useSessionStore } from '../auth/sessionStore';

export const profileQueryKey = (userId: string | undefined) => ['profile', userId] as const;

async function fetchProfile(userId: string) {
  const result = await supabase
    .from('profiles')
    .select('id, name, units, is_premium, onboarding_step, onboarding_completed_at')
    .eq('user_id', userId)
    .single();
  return required(result);
}

/** The signed-in user's profile. Routing uses onboarding_completed_at. */
export function useProfile() {
  const userId = useSessionStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: profileQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: () => fetchProfile(userId!),
  });
}
