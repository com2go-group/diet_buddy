import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { haptics } from '@/lib/haptics';
import { track } from '@/lib/telemetry';
import {
  getPlans,
  purchase,
  PurchaseCancelled,
  purchasesAvailable,
  restore,
} from '@/lib/purchases';

import { syncPremium } from './sync';
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

  const after = async (premium: boolean) => {
    if (premium) {
      setStore(true);
      haptics.success();
    }
    // Have the server confirm with RevenueCat now rather than waiting for the webhook, then
    // refresh the parts of the app that depend on the server flag.
    await syncPremium();
    for (const key of ['premium', 'profileOverview', 'coach']) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };

  const buy = useMutation({
    mutationFn: (planId: string) => purchase(planId),
    onMutate: (planId) => track('purchase_started', { plan: planId }),
    onSuccess: (premium, planId) => {
      track('purchase_completed', { plan: planId, premium });
      return after(premium);
    },
    onError: (e) =>
      track(e instanceof PurchaseCancelled ? 'purchase_cancelled' : 'purchase_failed'),
  });
  const restoreMutation = useMutation({ mutationFn: () => restore(), onSuccess: after });

  return {
    available,
    plans,
    buy,
    restore: restoreMutation,
    cancelled: buy.error instanceof PurchaseCancelled,
  };
}
