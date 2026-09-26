import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { haptics } from '@/lib/haptics';

import { useSessionStore } from '../auth/sessionStore';
import { addGlass, loadHome, removeWaterLog } from './api';
import { GLASS_ML, type HomeData } from './summary';

export const homeQueryKey = (userId: string | undefined) => ['home', userId] as const;

export function useHome() {
  const userId = useSessionStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const key = homeQueryKey(userId);
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(userId),
    queryFn: () => loadHome(userId!, new Date()),
  });

  // Water taps update the screen immediately and roll back if the save fails.
  const optimistic = (change: (data: HomeData) => HomeData) => async () => {
    await queryClient.cancelQueries({ queryKey: key });
    const previous = queryClient.getQueryData<HomeData>(key);
    if (previous) queryClient.setQueryData<HomeData>(key, change(previous));
    return { previous };
  };
  const rollback = (_e: unknown, _v: unknown, ctx: { previous?: HomeData } | undefined) => {
    if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
  };
  const settle = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: key }),
      queryClient.invalidateQueries({ queryKey: ['progress'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    ]);

  const add = useMutation({
    mutationFn: () => addGlass(userId!),
    onMutate: optimistic((d) => ({
      ...d,
      water: [
        ...d.water,
        { id: `pending-${Date.now()}`, logged_at: new Date().toISOString(), ml: GLASS_ML },
      ],
    })),
    onSuccess: () => haptics.selection(),
    onError: rollback,
    onSettled: settle,
  });
  const remove = useMutation({
    mutationFn: (id: string) => removeWaterLog(id),
    onMutate: (id) => optimistic((d) => ({ ...d, water: d.water.filter((w) => w.id !== id) }))(),
    onError: rollback,
    onSettled: settle,
  });

  return {
    query,
    addGlass: () => add.mutate(),
    removeWater: (id: string) => remove.mutate(id),
    waterError: add.isError || remove.isError,
  };
}
