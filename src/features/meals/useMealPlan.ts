import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { dayKey } from '@/lib/dates';

import { useSessionStore } from '../auth/sessionStore';
import { useRewardedUnlock } from '../ads/useAds';
import { usePremium } from '../subscriptions/usePremium';
import { generateMealPlan, loadMealPlan, type MealPlanDay } from './mealPlanApi';

export function useMealPlan(day: Date) {
  const userId = useSessionStore((s) => s.session?.user.id);
  const date = dayKey(day);
  const key = ['mealPlan', userId, date];
  const queryClient = useQueryClient();
  const { premium } = usePremium();
  const unlockAd = useRewardedUnlock();
  const [watching, setWatching] = useState(false);
  const [localUnlock, setLocalUnlock] = useState<string | null>(null);

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
        unlocked: old?.unlocked ?? false,
      })),
  });

  /** Opt-in rewarded video; the server records the unlock (and XP) from Google's callback. */
  const watchToUnlock = async () => {
    setWatching(true);
    const outcome = await unlockAd('meal_plan', date).finally(() => setWatching(false));
    if (outcome === 'earned') {
      setLocalUnlock(date);
      queryClient.invalidateQueries({ queryKey: key });
    }
  };

  const locked = !premium && !query.data?.unlocked && localUnlock !== date;
  return { date, query, generate, premium, locked, watching, watchToUnlock };
}
