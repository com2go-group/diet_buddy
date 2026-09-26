import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Enums } from '@/lib/supabase';

import { useSessionStore } from '../auth/sessionStore';
import {
  deleteAccount,
  exportData,
  loadConsents,
  loadOverview,
  savePlanVersion,
  setConsent,
  setUnits,
  type OptionalConsent,
} from './api';
import type { CurrentPlan } from './goals';
import { saveExport } from './saveExport';

const DEPENDENT = ['profileOverview', 'home', 'meals', 'progress', 'account'];

export function useProfileOverview() {
  const userId = useSessionStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['profileOverview', userId],
    enabled: Boolean(userId),
    queryFn: () => loadOverview(userId!, new Date()),
  });
  const refresh = () =>
    Promise.all(DEPENDENT.map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
  const units = useMutation({
    mutationFn: (value: Enums<'unit_system'>) => setUnits(userId!, value),
    onSettled: refresh,
  });
  const plan = useMutation({
    mutationFn: (next: CurrentPlan) => savePlanVersion(userId!, next),
    onSettled: refresh,
  });
  return { query, units, plan };
}

export function useConsents() {
  const userId = useSessionStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const key = ['consents', userId];
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(userId),
    queryFn: () => loadConsents(userId!),
  });
  const update = useMutation({
    mutationFn: ({ type, granted }: { type: OptionalConsent; granted: boolean }) =>
      setConsent(type, granted),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  return { query, update };
}

export function useExportData() {
  return useMutation({ mutationFn: async () => saveExport(await exportData()) });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => queryClient.clear(),
  });
}
