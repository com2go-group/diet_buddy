import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';

import { haptics } from '@/lib/haptics';
import { ageOn } from '@/lib/nutrition';

import { profileQueryKey } from '../account/useProfile';
import { useSessionStore } from '../auth/sessionStore';
import type { OnboardingState } from '../onboarding/api';
import { partsToDate } from '../onboarding/draft';
import { saveBodyScan } from './api';
import { scanResults, type MetricKey, type Overrides, type ScanInputs } from './results';

export type ScanMode = 'choose' | 'manual' | 'results';

export interface TapeInputs {
  weightKg: number | null;
  heightCm: number | null;
  waistCm: number | null;
  neckCm: number | null;
  hipCm: number | null;
}

/** State for the body-scan screen: mode, tape inputs, the user's edits and saving. */
export function useBodyScan({ draft, goalId }: OnboardingState) {
  const userId = useSessionStore((s) => s.session?.user.id)!;
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<ScanMode>('choose');
  const [tape, setTape] = useState<TapeInputs>({
    weightKg: draft.weightKg,
    heightCm: draft.heightCm,
    waistCm: null,
    neckCm: null,
    hipCm: null,
  });
  const [overrides, setOverrides] = useState<Overrides>({});

  const birth = useMemo(() => partsToDate(draft.birthDate), [draft.birthDate]);
  const inputs: ScanInputs | null = useMemo(
    () =>
      birth && tape.weightKg && tape.heightCm && draft.activity
        ? {
            sex: draft.sex ?? 'unspecified',
            ageYears: ageOn(birth),
            heightCm: tape.heightCm,
            weightKg: tape.weightKg,
            activity: draft.activity,
            waistCm: tape.waistCm,
            neckCm: tape.neckCm,
            hipCm: tape.hipCm,
          }
        : null,
    [birth, tape, draft.activity, draft.sex],
  );
  const results = useMemo(
    () => (inputs ? scanResults(inputs, overrides) : null),
    [inputs, overrides],
  );

  const save = useMutation({
    mutationFn: () => saveBodyScan(userId, draft, goalId, inputs!, results!),
    onSuccess: async () => {
      haptics.success();
      await queryClient.invalidateQueries({ queryKey: profileQueryKey(userId) });
      router.replace('/initial-plan');
    },
  });

  return {
    mode,
    setMode,
    tape,
    setTape: (patch: Partial<TapeInputs>) => setTape((t) => ({ ...t, ...patch })),
    inputs,
    results,
    edit: (key: MetricKey, value: number) => setOverrides((o) => ({ ...o, [key]: value })),
    reset: () => setOverrides({}),
    save: () => save.mutate(),
    saving: save.isPending,
    saveFailed: save.isError,
    units: draft.units,
    name: draft.name,
    ageYears: birth ? ageOn(birth) : null,
  };
}

export type BodyScanController = ReturnType<typeof useBodyScan>;
