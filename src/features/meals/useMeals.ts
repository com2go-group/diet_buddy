import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { dayKey } from '@/lib/dates';
import { haptics } from '@/lib/haptics';

import { useSessionStore } from '../auth/sessionStore';
import {
  deleteFoodLog,
  loadMealsDay,
  loadRecentLogs,
  logFood,
  searchFoods,
  type MealsDay,
} from './api';
import { recentFoods } from './portion';
import type { NewFoodLog } from './types';

export const mealsQueryKey = (userId: string | undefined, day: Date) =>
  ['meals', userId, dayKey(day)] as const;

/** Anything showing food totals (Meals, Home, Progress) refreshes after a change. */
function invalidateFood(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all(
    ['meals', 'home', 'recentFoods', 'progress'].map((key) =>
      queryClient.invalidateQueries({ queryKey: [key] }),
    ),
  );
}

export function useMealsDay(day: Date) {
  const userId = useSessionStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const key = mealsQueryKey(userId, day);
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(userId),
    queryFn: () => loadMealsDay(userId!, day),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteFoodLog(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MealsDay>(key);
      if (previous) {
        queryClient.setQueryData<MealsDay>(key, {
          ...previous,
          logs: previous.logs.filter((l) => l.id !== id),
        });
      }
      haptics.selection();
      return { previous };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    onSettled: () => invalidateFood(queryClient),
  });
  return { query, remove };
}

export function useLogFood() {
  const userId = useSessionStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entry: NewFoodLog) => logFood(userId!, entry),
    onSuccess: () => haptics.success(),
    onSettled: () => invalidateFood(queryClient),
  });
}

export function useRecentFoods() {
  const userId = useSessionStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['recentFoods', userId],
    enabled: Boolean(userId),
    queryFn: async () => recentFoods(await loadRecentLogs(userId!, new Date())),
  });
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

/** Debounced USDA search; idle until the query has 2+ characters. */
export function useFoodSearch(text: string) {
  const query = useDebounced(text.trim().replace(/\s+/g, ' ').toLowerCase(), 350);
  const enabled = query.length >= 2;
  const result = useQuery({
    queryKey: ['foodSearch', query],
    enabled,
    queryFn: () => searchFoods(query),
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
  return {
    ...result,
    enabled,
    pending:
      enabled && (result.isPending || query !== text.trim().replace(/\s+/g, ' ').toLowerCase()),
  };
}
