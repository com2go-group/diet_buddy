import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { haptics } from '@/lib/haptics';
import {
  getPlans,
  purchase,
  PurchaseCancelled,
  purchasesAvailable,
  restore,
} from '@/lib/purchases';

import { useStorePremium } from './usePremium';

export function usePaywall() {
  const queryClient = useQueryClient();
  const setStore = useStorePremium((s) => s.set);
  const available = purchasesAvailable();
  const plans = useQuery({
    queryKey: ['plans'],
    enabled: available,
    queryFn: getPlans,
    staleTime: 5 * 60_000,
  });

  const after = (premium: boolean) => {
    if (premium) {
      setStore(true);
      haptics.success();
    }
    // The webhook sets the server flag; refresh the parts of the app that depend on it.
    for (const key of ['premium', 'profileOverview', 'coach']) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };

  const buy = useMutation({ mutationFn: (planId: string) => purchase(planId), onSuccess: after });
  const restoreMutation = useMutation({ mutationFn: () => restore(), onSuccess: after });

  return {
    available,
    plans,
    buy,
    restore: restoreMutation,
    cancelled: buy.error instanceof PurchaseCancelled,
  };
}
