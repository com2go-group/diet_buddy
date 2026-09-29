import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { isNetworkError, useOfflineQueue, type QueuedItem } from '@/lib/offline/queue';

import { useSessionStore } from '../auth/sessionStore';
import { addGlass } from '../home/api';
import { logFood } from '../meals/api';

const RETRY_MS = 60_000;

async function send(item: QueuedItem): Promise<void> {
  if (item.kind === 'food') {
    await logFood(item.userId, { ...item.entry, loggedAt: new Date(item.entry.loggedAt) });
  } else {
    await addGlass(item.userId, new Date(item.loggedAt), item.ml);
  }
}

/**
 * Sends this user's waiting logs in order. Stops at the first network error (still offline);
 * an entry the server rejects for another reason is dropped so it can't block the rest.
 * Returns how many were sent.
 */
export async function flushQueue(userId: string): Promise<number> {
  const { items, remove } = useOfflineQueue.getState();
  let sent = 0;
  for (const item of items.filter((i) => i.userId === userId)) {
    try {
      await send(item);
      remove(item.id);
      sent++;
    } catch (e) {
      if (isNetworkError(e)) break;
      remove(item.id);
    }
  }
  return sent;
}

let flushing = false;

/** Flushes on sign-in, when the app comes to the foreground and every minute while items wait. */
export function useOfflineSync(): void {
  const userId = useSessionStore((s) => s.session?.user.id);
  const pending = useOfflineQueue((s) => s.items.some((i) => i.userId === userId));
  const queryClient = useQueryClient();

  useEffect(() => {
    // A shared phone must never send one person's logs as another's.
    if (!userId) useOfflineQueue.getState().clear();
  }, [userId]);

  useEffect(() => {
    if (!userId || !pending) return;
    const run = async () => {
      if (flushing) return;
      flushing = true;
      try {
        if ((await flushQueue(userId)) > 0) {
          await Promise.all(
            ['meals', 'home', 'recentFoods', 'progress', 'notifications'].map((key) =>
              queryClient.invalidateQueries({ queryKey: [key] }),
            ),
          );
        }
      } finally {
        flushing = false;
      }
    };
    run();
    const timer = setInterval(run, RETRY_MS);
    const sub = AppState.addEventListener('change', (state) => state === 'active' && run());
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [userId, pending, queryClient]);
}

/** How many of this user's logs are waiting to be sent. */
export function usePendingCount(): number {
  const userId = useSessionStore((s) => s.session?.user.id);
  return useOfflineQueue((s) => s.items.filter((i) => i.userId === userId).length);
}
