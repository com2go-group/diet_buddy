import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorState, SkeletonCard } from '@/components';
import { optional, required, supabase } from '@/lib/supabase';

import { useSessionStore } from '../auth/sessionStore';
import type { OnboardingState } from '../onboarding/api';
import { EMPTY_DRAFT, isoToParts } from '../onboarding/draft';
import { BodyScan } from './BodyScanScreen';

/** What the body-scan calculation needs, from the saved profile (after onboarding). */
async function loadCheckState(userId: string): Promise<OnboardingState> {
  const [profile, prefs, weight] = await Promise.all([
    supabase
      .from('profiles')
      .select('name, birth_date, gender, height_cm, units')
      .eq('user_id', userId)
      .single(),
    supabase.from('preferences').select('activity_level').eq('user_id', userId).limit(1),
    supabase
      .from('body_metrics')
      .select('weight_kg')
      .eq('user_id', userId)
      .not('weight_kg', 'is', null)
      .order('measured_at', { ascending: false })
      .limit(1),
  ]);
  const p = required(profile);
  return {
    draft: {
      ...EMPTY_DRAFT,
      name: p.name ?? '',
      birthDate: isoToParts(p.birth_date),
      sex: p.gender,
      units: p.units,
      heightCm: p.height_cm === null ? null : Number(p.height_cm),
      weightKg: optional(weight)?.[0]?.weight_kg ?? null,
      activity: optional(prefs)?.[0]?.activity_level ?? null,
    },
    step: 'aiPlan',
    goalId: null,
  };
}

const close = () => (router.canGoBack() ? router.back() : router.replace('/progress'));

/** Progress → Body → Body check: manual tape or the AI photo scan (Premium), saved as a new entry. */
export function BodyCheckScreen() {
  const userId = useSessionStore((s) => s.session?.user.id);
  const state = useQuery({
    queryKey: ['bodyCheck', userId],
    enabled: Boolean(userId),
    queryFn: () => loadCheckState(userId!),
    gcTime: 0,
  });
  if (state.isPending) {
    return (
      <SafeAreaView className="flex-1 gap-4 bg-background px-5 pt-16">
        <SkeletonCard lines={3} />
      </SafeAreaView>
    );
  }
  if (state.isError) {
    return (
      <SafeAreaView className="flex-1 justify-center bg-background px-5">
        <ErrorState onRetry={() => state.refetch()} />
      </SafeAreaView>
    );
  }
  return <BodyScan initial={state.data} context="check" onSaved={close} onExit={close} />;
}
