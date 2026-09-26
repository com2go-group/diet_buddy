import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';

import {
  healthAvailable,
  healthPlatform,
  readToday,
  readWeights,
  requestHealthAccess,
  writeWater,
  writeWeight,
  READ_SCOPES,
} from '@/lib/health';
import { optional, supabase } from '@/lib/supabase';

import { useSessionStore } from '../auth/sessionStore';
import { FIRST_SYNC_DAYS, newWeights, SYNC_INTERVAL_MS } from './sync';

/** Whether this device is connected, for write-backs from other features. */
export const useHealthStore = create<{ connected: boolean; set: (c: boolean) => void }>((set) => ({
  connected: false,
  set: (connected) => set({ connected }),
}));

const lastSyncKey = (userId: string) => `health-last-sync:${userId}`;

async function loadConnected(userId: string): Promise<boolean> {
  if (!healthPlatform) return false;
  const result = await supabase
    .from('device_connections')
    .select('id')
    .eq('user_id', userId)
    .eq('platform', healthPlatform)
    .limit(1);
  return (optional(result) ?? []).length > 0;
}

/** Imports new weights from the health store into body_metrics. Returns how many were added. */
export async function syncWeights(userId: string): Promise<number> {
  if (!healthPlatform) return 0;
  const last = await AsyncStorage.getItem(lastSyncKey(userId)).catch(() => null);
  const since = last
    ? new Date(new Date(last).getTime() - 86_400_000)
    : new Date(Date.now() - FIRST_SYNC_DAYS * 86_400_000);
  const samples = await readWeights(since);
  const stored = await supabase
    .from('body_metrics')
    .select('measured_at, weight_kg')
    .eq('user_id', userId)
    .gte('measured_at', new Date(since.getTime() - 3_600_000).toISOString());
  const fresh = newWeights(samples, optional(stored) ?? []);
  if (fresh.length) {
    optional(
      await supabase.from('body_metrics').insert(
        fresh.map((w) => ({
          user_id: userId,
          measured_at: w.at.toISOString(),
          weight_kg: w.kg,
          source: healthPlatform!,
        })),
      ),
    );
  }
  await AsyncStorage.setItem(lastSyncKey(userId), new Date().toISOString()).catch(() => undefined);
  return fresh.length;
}

export function useHealthConnection() {
  const userId = useSessionStore((s) => s.session?.user.id);
  const setConnected = useHealthStore((s) => s.set);
  const queryClient = useQueryClient();
  const key = ['healthConnection', userId];
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(userId),
    queryFn: async () => {
      const [available, connected] = await Promise.all([healthAvailable(), loadConnected(userId!)]);
      setConnected(available && connected);
      return { available, connected };
    },
  });
  const refresh = () =>
    ['healthConnection', 'progress', 'home', 'todayActivity'].forEach((k) =>
      queryClient.invalidateQueries({ queryKey: [k] }),
    );

  const connect = useMutation({
    mutationFn: async () => {
      const granted = await requestHealthAccess();
      if (!granted) return false;
      optional(
        await supabase.from('device_connections').upsert(
          {
            user_id: userId!,
            platform: healthPlatform!,
            scopes: [...READ_SCOPES],
            connected_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,platform' },
        ),
      );
      setConnected(true);
      await syncWeights(userId!).catch(() => 0);
      return true;
    },
    onSettled: refresh,
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      optional(
        await supabase
          .from('device_connections')
          .delete()
          .eq('user_id', userId!)
          .eq('platform', healthPlatform!),
      );
      setConnected(false);
    },
    onSettled: refresh,
  });

  const sync = useMutation({ mutationFn: () => syncWeights(userId!), onSettled: refresh });

  return { platform: healthPlatform, query, connect, disconnect, sync };
}

/** Background sync: on sign-in and when the app returns to the foreground (at most every 30 min). */
export function useHealthSync(): void {
  const userId = useSessionStore((s) => s.session?.user.id);
  const setConnected = useHealthStore((s) => s.set);
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!healthPlatform || !userId) return;
    let lastRun = 0;
    const run = async () => {
      if (Date.now() - lastRun < SYNC_INTERVAL_MS) return;
      lastRun = Date.now();
      const connected =
        (await healthAvailable()) && (await loadConnected(userId).catch(() => false));
      setConnected(connected);
      if (!connected) return;
      const added = await syncWeights(userId).catch(() => 0);
      if (added)
        ['progress', 'home'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
    };
    run();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && run());
    return () => sub.remove();
  }, [userId, setConnected, queryClient]);
}

export function useTodayActivity() {
  const connected = useHealthStore((s) => s.connected);
  return useQuery({
    queryKey: ['todayActivity'],
    enabled: connected,
    queryFn: readToday,
    staleTime: 5 * 60_000,
  });
}

/** Mirrors a DietBuddy log into the health store when connected. Never blocks or fails the log. */
export const mirrorToHealth = {
  water: (ml: number) => {
    if (useHealthStore.getState().connected) writeWater(ml, new Date()).catch(() => undefined);
  },
  weight: (kg: number) => {
    if (useHealthStore.getState().connected) writeWeight(kg, new Date()).catch(() => undefined);
  },
};
