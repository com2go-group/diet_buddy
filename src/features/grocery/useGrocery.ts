import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { addDays, dayKey } from '@/lib/dates';
import { haptics } from '@/lib/haptics';

import { useSessionStore } from '../auth/sessionStore';
import { generateMealPlan } from '../meals/mealPlanApi';
import {
  generateGroceryList,
  loadGroceryList,
  loadWeekPlans,
  saveChecked,
  type GroceryList,
} from './api';

export const WEEK = 7;

export function weekDates(start: Date): string[] {
  return Array.from({ length: WEEK }, (_, i) => dayKey(addDays(start, i)));
}

export function useGrocery(now: Date, enabled: boolean) {
  const userId = useSessionStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const dates = weekDates(now);
  const startDate = dates[0]!;
  const listKey = ['groceryList', userId, startDate];
  const plansKey = ['weekPlans', userId, startDate];

  const list = useQuery({
    queryKey: listKey,
    enabled: enabled && Boolean(userId),
    queryFn: () => loadGroceryList(userId!, startDate),
  });
  const plans = useQuery({
    queryKey: plansKey,
    enabled: enabled && Boolean(userId),
    queryFn: () => loadWeekPlans(userId!, dates),
  });

  // Which day is being planned, for progress text.
  const [planning, setPlanning] = useState<{ index: number; date: string } | 'list' | null>(null);
  const build = useMutation({
    mutationFn: async () => {
      const have = new Set((plans.data ?? []).map((p) => p.date));
      for (const [index, date] of dates.entries()) {
        if (have.has(date)) continue;
        setPlanning({ index, date });
        await generateMealPlan(date, false);
      }
      await queryClient.invalidateQueries({ queryKey: plansKey });
      setPlanning('list');
      return generateGroceryList(startDate, list.data !== null && list.data !== undefined);
    },
    onSuccess: (result) => {
      queryClient.setQueryData(listKey, result);
      haptics.success();
    },
    onSettled: () => {
      setPlanning(null);
      void queryClient.invalidateQueries({ queryKey: plansKey });
      void queryClient.invalidateQueries({ queryKey: ['mealPlan'] });
    },
  });

  const toggle = useMutation({
    mutationFn: (checked: string[]) => saveChecked(userId!, startDate, checked),
    onMutate: async (checked) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<GroceryList | null>(listKey);
      if (previous) queryClient.setQueryData(listKey, { ...previous, checked });
      haptics.selection();
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(listKey, ctx.previous);
    },
  });

  return { dates, startDate, list, plans, build, planning, toggle };
}
