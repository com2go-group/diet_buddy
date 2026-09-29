import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Per-device memory of a new user's first days, keyed by user ID so a shared phone doesn't mix
 * accounts: when onboarding finished (for the first-day checklist), whether the one-time trial
 * offer is still to show, and whether the checklist was closed. Nothing here is sensitive or
 * needed by the server; losing it only means the offer or checklist doesn't show again.
 */
interface JourneyState {
  onboardedAt: Record<string, string>;
  welcomeOfferPending: Record<string, boolean>;
  checklistDismissed: Record<string, boolean>;
  onboarded: (userId: string, at?: Date) => void;
  welcomeOfferShown: (userId: string) => void;
  dismissChecklist: (userId: string) => void;
}

export const useJourneyStore = create<JourneyState>()(
  persist(
    (set) => ({
      onboardedAt: {},
      welcomeOfferPending: {},
      checklistDismissed: {},
      onboarded: (userId, at = new Date()) =>
        set((s) => ({
          onboardedAt: { ...s.onboardedAt, [userId]: at.toISOString() },
          welcomeOfferPending: { ...s.welcomeOfferPending, [userId]: true },
        })),
      welcomeOfferShown: (userId) =>
        set((s) => ({ welcomeOfferPending: { ...s.welcomeOfferPending, [userId]: false } })),
      dismissChecklist: (userId) =>
        set((s) => ({ checklistDismissed: { ...s.checklistDismissed, [userId]: true } })),
    }),
    { name: 'journey', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** The first-day checklist shows for 3 days after onboarding, until done or closed. */
export const CHECKLIST_DAYS = 3;

export function checklistActive(onboardedAt: string | undefined, now: Date): boolean {
  if (!onboardedAt) return false;
  const start = new Date(onboardedAt).getTime();
  return now.getTime() - start < CHECKLIST_DAYS * 86_400_000;
}
