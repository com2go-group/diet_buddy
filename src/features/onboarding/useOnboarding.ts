import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { formatWeight } from '@/lib/format';
import { haptics } from '@/lib/haptics';

import { profileQueryKey } from '../account/useProfile';
import { useSessionStore } from '../auth/sessionStore';
import { loadOnboarding, saveStep, type OnboardingState } from './api';
import { validateStep, type OnboardingDraft, type StepErrors } from './draft';
import { buildSteps, type StepId } from './options';

/**
 * Drives the onboarding flow: loads saved progress, keeps the draft, validates and saves each
 * step on Continue, and completes onboarding on the last step.
 */
export const onboardingQueryKey = (userId: string | undefined) => ['onboarding', userId] as const;

/**
 * Saved onboarding answers. Refetched when a screen mounts so it sees the latest answers, but not
 * on focus or reconnect: screens copy this into local state, and a refetch mid-edit would reset it.
 */
export function useSavedOnboarding() {
  const userId = useSessionStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: onboardingQueryKey(userId),
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: Boolean(userId),
    queryFn: () => loadOnboarding(userId!),
    staleTime: Infinity,
    gcTime: 0,
  });
}

export function useOnboarding(initial: OnboardingState) {
  const userId = useSessionStore((s) => s.session?.user.id)!;
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<OnboardingDraft>(initial.draft);
  const [step, setStep] = useState<StepId>(initial.step);
  const [goalId, setGoalId] = useState<string | null>(initial.goalId);
  const [errors, setErrors] = useState<StepErrors>({});
  const [direction, setDirection] = useState<1 | -1>(1);

  const steps = useMemo(() => buildSteps(draft.goals), [draft.goals]);
  const index = Math.max(0, steps.indexOf(step));
  const isLast = index === steps.length - 1;
  const weight = useCallback(
    (kg: number, decimals?: number) => formatWeight(kg, draft.units, decimals),
    [draft.units],
  );

  const update = useCallback((patch: Partial<OnboardingDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setErrors({});
  }, []);

  const save = useMutation({
    mutationFn: async ({ skip }: { skip: boolean }) => {
      // After the last question comes the body scan (CLAUDE.md §6).
      const next = isLast ? 'bodyScan' : steps[index + 1]!;
      // A skipped step saves no answers but still records progress.
      setGoalId(await saveStep(userId, skip ? null : step, next, draft, goalId));
      return next;
    },
    onSuccess: async (next) => {
      if (next !== 'bodyScan') {
        setDirection(1);
        setStep(next);
        return;
      }
      haptics.success();
      // The cached answers are from when this screen loaded; the body scan must read the saved ones.
      queryClient.removeQueries({ queryKey: onboardingQueryKey(userId) });
      await queryClient.invalidateQueries({ queryKey: profileQueryKey(userId) });
      router.replace('/body-scan');
    },
  });

  const next = (options: { skip?: boolean } = {}) => {
    if (!options.skip) {
      const found = validateStep(step, draft, weight);
      setErrors(found);
      if (Object.keys(found).length > 0) {
        haptics.warning();
        return;
      }
    }
    save.mutate({ skip: Boolean(options.skip) });
  };

  const back = () => {
    if (index === 0) return false;
    setDirection(-1);
    setErrors({});
    save.reset();
    setStep(steps[index - 1]!);
    return true;
  };

  return {
    draft,
    update,
    step,
    index,
    total: steps.length,
    isLast,
    errors,
    direction,
    next,
    back,
    saving: save.isPending,
    saveFailed: save.isError,
    formatWeight: weight,
  };
}

export type OnboardingController = ReturnType<typeof useOnboarding>;
