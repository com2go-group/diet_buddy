import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { showInterstitial } from '@/lib/ads';
import { dayKey } from '@/lib/dates';

import { useShowAds } from '../ads';
import { useSessionStore } from '../auth/sessionStore';
import { useJourneyStore } from '../home/journeyStore';

/**
 * Whether the Meals tab shows its daily full-screen ad now: free users on a phone, at most once
 * per local day, and not on the day they finished onboarding (they saw one after the questions).
 */
export function dailyAdDue(opts: {
  enabled: boolean;
  shownOn: string | undefined;
  onboardedAt: string | undefined;
  now: Date;
}): boolean {
  const today = dayKey(opts.now);
  if (!opts.enabled || opts.shownOn === today) return false;
  return !opts.onboardedAt || dayKey(new Date(opts.onboardedAt)) !== today;
}

/**
 * One interstitial when a free user first opens Meals each day (decision log 2026-09-29): it
 * helps pay for the day's AI meal plan. Marked as shown before it opens, so a failed or closed
 * ad never comes back the same day.
 */
export function useDailyMealsAd(): void {
  const userId = useSessionStore((s) => s.session?.user.id);
  const ads = useShowAds();
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      const journey = useJourneyStore.getState();
      const now = new Date();
      if (
        !dailyAdDue({
          enabled: ads.enabled,
          shownOn: journey.mealsAdShownOn[userId],
          onboardedAt: journey.onboardedAt[userId],
          now,
        })
      ) {
        return;
      }
      journey.mealsAdShown(userId, dayKey(now));
      showInterstitial(ads.personalised).catch(() => undefined);
    }, [userId, ads.enabled, ads.personalised]),
  );
}
