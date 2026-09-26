import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { create } from 'zustand';

import {
  configurePurchases,
  onCustomerInfo,
  premiumFromStore,
  purchasesAvailable,
  resetPurchases,
} from '@/lib/purchases';
import { optional, supabase } from '@/lib/supabase';

import { useSessionStore } from '../auth/sessionStore';

/** Premium as the store SDK reports it on this device (instant after purchase/restore). */
export const useStorePremium = create<{ premium: boolean; set: (p: boolean) => void }>((set) => ({
  premium: false,
  set: (premium) => set({ premium }),
}));

async function serverPremium(userId: string): Promise<boolean> {
  const result = await supabase
    .from('profiles')
    .select('is_premium')
    .eq('user_id', userId)
    .single();
  return Boolean(optional(result)?.is_premium);
}

/**
 * Premium = the server flag (set by the RevenueCat webhook, what the backend trusts) or the
 * device's store entitlement (so the app unlocks right after buying, before the webhook lands).
 */
export function usePremium(): { premium: boolean; loading: boolean } {
  const userId = useSessionStore((s) => s.session?.user.id);
  const store = useStorePremium((s) => s.premium);
  const query = useQuery({
    queryKey: ['premium', userId],
    enabled: Boolean(userId),
    queryFn: () => serverPremium(userId!),
    staleTime: 60_000,
  });
  return { premium: store || Boolean(query.data), loading: query.isPending && !store };
}

/** Configures RevenueCat for the signed-in user and keeps the store flag current. */
export function usePurchasesSetup(): void {
  const userId = useSessionStore((s) => s.session?.user.id);
  const setStore = useStorePremium((s) => s.set);
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!purchasesAvailable()) return;
    if (!userId) {
      setStore(false);
      resetPurchases().catch(() => undefined);
      return;
    }
    let cancelled = false;
    let unsubscribe = () => {};
    configurePurchases(userId)
      .then(async () => {
        if (cancelled) return;
        setStore(await premiumFromStore());
        unsubscribe = onCustomerInfo((premium) => {
          setStore(premium);
          // The webhook updates the server shortly after; refresh what depends on it.
          queryClient.invalidateQueries({ queryKey: ['premium'] });
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [userId, setStore, queryClient]);
}
