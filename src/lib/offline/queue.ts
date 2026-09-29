import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Logs made without a connection wait here (on this device only) and are sent when the app is
 * online again, keeping the time they were logged. Each entry belongs to one user; signing out
 * clears the queue so a shared phone never sends one person's logs as another's.
 */
export interface QueuedFood {
  kind: 'food';
  /** Same shape as NewFoodLog, with the date as an ISO string. */
  entry: {
    slot: 'breakfast' | 'lunch' | 'snack' | 'dinner';
    loggedAt: string;
    name: string;
    foodRef: string | null;
    quantity: number | null;
    unit: string | null;
    macros: { kcal: number; proteinG: number; carbsG: number; fatG: number };
    source: 'search' | 'manual' | 'photo' | 'plan' | 'restaurant';
  };
}
export interface QueuedWater {
  kind: 'water';
  loggedAt: string;
  ml: number;
}
export type NewQueuedItem = (QueuedFood | QueuedWater) & { userId: string };
export type QueuedItem = NewQueuedItem & { id: string };

interface QueueState {
  items: QueuedItem[];
  add: (item: NewQueuedItem) => void;
  remove: (id: string) => void;
  clear: () => void;
}

let counter = 0;
const newId = () => `${Date.now().toString(36)}-${(counter++).toString(36)}`;

export const useOfflineQueue = create<QueueState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) => set((s) => ({ items: [...s.items, { ...item, id: newId() }] })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'offline-queue', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** Whether a failed request never reached the server (no connection), so it's safe to retry. */
export function isNetworkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /network request failed|failed to fetch|fetch failed|networkerror|load failed|network error|timed? ?out/i.test(
    message,
  );
}
