import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { dayKey } from '@/lib/dates';

import { useSessionStore } from '../auth/sessionStore';
import { useRewardedUnlock } from '../ads/useAds';
import { usePremium } from '../subscriptions/usePremium';
import { generateMealPlan, loadMealPlan, unlockTarget, type MealPlanDay } from './mealPlanApi';
import type { MealSlot } from './types';

export function useMealPlan(day: Date, slot: MealSlot) {
  const userId = useSessionStore((s) => s.session?.user.id);
  const date = dayKey(day);
  const key = ['mealPlan', userId, date];
  const queryClient = useQueryClient();
  const { premium } = usePremium();
  const unlockAd = useRewardedUnlock();
  const [watching, setWatching] = useState(false);
  const [localUnlocks, setLocalUnlocks] = useState<string[]>([]);

  const query = useQuery({
    queryKey: key,
    enabled: Boolean(userId),
    queryFn: () => loadMealPlan(userId!, date),
  });
  const generate = useMutation({
    mutationFn: (regenerate: boolean) => generateMealPlan(date, regenerate),
    onSuccess: (plan) =>
      queryClient.setQueryData<MealPlanDay>(key, (old) => ({
        plan,
        unlockedSlots: old?.unlockedSlots ?? [],
      })),
  });

  const target = unlockTarget(date, slot);
  /**
   * Opt-in rewarded video for this meal; the server records the unlock (and XP) from Google's
   * callback.
   */
  const watchToUnlock = async () => {
    setWatching(true);
    const outcome = await unlockAd('meal_plan', target).finally(() => setWatching(false));
    if (outcome === 'earned') {
      setLocalUnlocks((s) => [...s, target]);
      queryClient.invalidateQueries({ queryKey: key });
    }
  };

  const locked =
    !premium && !query.data?.unlockedSlots.includes(slot) && !localUnlocks.includes(target);
  return { date, query, generate, premium, locked, watching, watchToUnlock };
}
