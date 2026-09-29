import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { dayKey } from '@/lib/dates';
import { track } from '@/lib/telemetry';

import { useSessionStore } from '../auth/sessionStore';
import { useRewardedUnlock } from '../ads/useAds';
import { usePremium } from '../subscriptions/usePremium';
import {
  generateMealPlan,
  loadMealPlan,
  mealPlanAction,
  unlockTarget,
  type MealPlan,
  type MealPlanDay,
} from './mealPlanApi';
import type { MealSlot } from './types';

/**
 * The day's plan and this day's per-meal video unlocks (shared cache for the whole screen). Every
 * change the app makes writes the server's answer into this cache, so the meal cards that mount
 * after a change don't need to fetch it again (pull to refresh still does).
 */
export function useMealPlanDay(day: Date) {
  const userId = useSessionStore((s) => s.session?.user.id);
  const date = dayKey(day);
  return useQuery({
    queryKey: ['mealPlan', userId, date],
    enabled: Boolean(userId),
    staleTime: 60_000,
    queryFn: () => loadMealPlan(userId!, date),
  });
}

/** Keeps a plan returned by the server in the day's cache. */
function useStorePlan(date: string) {
  const userId = useSessionStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  return (plan: MealPlan) =>
    queryClient.setQueryData<MealPlanDay>(['mealPlan', userId, date], (old) => ({
      plan,
      unlockedSlots: old?.unlockedSlots ?? [],
    }));
}

/** Creates the day's plan, or (Premium, `true`) a new one. */
export function useGenerateMealPlan(day: Date) {
  const date = dayKey(day);
  const store = useStorePlan(date);
  return useMutation({
    mutationFn: (regenerate: boolean) => generateMealPlan(date, regenerate),
    onSuccess: store,
  });
}

/** One meal of the day's plan: its actions and the free tier's per-meal video unlock. */
export function useMealPlan(day: Date, slot: MealSlot) {
  const userId = useSessionStore((s) => s.session?.user.id);
  const date = dayKey(day);
  const key = ['mealPlan', userId, date];
  const queryClient = useQueryClient();
  const { premium } = usePremium();
  const unlockAd = useRewardedUnlock();
  const [watching, setWatching] = useState(false);
  const [localUnlocks, setLocalUnlocks] = useState<string[]>([]);

  const query = useMealPlanDay(day);
  const store = useStorePlan(date);
  /** "Another idea", "Skip" and "Undo" for this meal. */
  const act = useMutation({
    mutationFn: (action: 'alternative' | 'skip' | 'unskip') => mealPlanAction(date, action, slot),
    onSuccess: (plan, action) => {
      track('meal_plan_action', { action, slot });
      store(plan);
    },
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
  return { date, query, act, premium, locked, watching, watchToUnlock };
}
