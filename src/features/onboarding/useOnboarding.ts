import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { formatWeight } from '@/lib/format';
import { haptics } from '@/lib/haptics';

import { profileQueryKey } from '../account/useProfile';
import { useSessionStore } from '../auth/sessionStore';
import { completeOnboarding, loadOnboarding, saveStep, type OnboardingState } from './api';
import { validateStep, type OnboardingDraft, type StepErrors } from './draft';
import { buildSteps, type StepId } from './options';

/**
 * Drives the onboarding flow: loads saved progress, keeps the draft, validates and saves each
 * step on Continue, and completes onboarding on the last step.
 */
export function useSavedOnboarding() {
  const userId = useSessionStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['onboarding', userId],
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
      if (isLast) {
        await completeOnboarding(userId, draft);
        return null;
      }
      const next = steps[index + 1]!;
      // A skipped step saves no answers but still records progress.
      setGoalId(await saveStep(userId, skip ? null : step, next, draft, goalId));
      return next;
    },
    onSuccess: async (next) => {
      if (next) {
        setDirection(1);
        setStep(next);
        return;
      }
      haptics.success();
      // Routing sees onboarding_completed_at and moves on to the app.
      await queryClient.invalidateQueries({ queryKey: profileQueryKey(userId) });
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
