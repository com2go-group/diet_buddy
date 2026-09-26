import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { create } from 'zustand';

import {
  adsSupported,
  initAds,
  openAdPrivacyOptions,
  showRewarded,
  type AdsConsent,
  type RewardOutcome,
} from '@/lib/ads';
import { optional, supabase } from '@/lib/supabase';

import { useSessionStore } from '../auth/sessionStore';
import { OPTIONAL_CONSENT_VERSION } from '../profile/api';
import { usePremium } from '../subscriptions/usePremium';

export const useAdsStore = create<{ consent: AdsConsent | null; set: (c: AdsConsent) => void }>(
  (set) => ({ consent: null, set: (consent) => set({ consent }) }),
);

/** Mirrors the UMP personalisation choice into our consent records (§13 audit trail). */
async function mirrorConsent(personalised: boolean) {
  await supabase
    .rpc('set_consent', {
      p_type: 'ads_personalization',
      p_granted: personalised,
      p_version: OPTIONAL_CONSENT_VERSION,
    })
    .then(optional, () => undefined);
}

/**
 * Runs Google's consent flow once for signed-in free users, then starts AdMob.
 * Premium users never see the consent form or ads.
 */
export function useAdsSetup(): void {
  const userId = useSessionStore((s) => s.session?.user.id);
  const { premium, loading } = usePremium();
  const setConsent = useAdsStore((s) => s.set);
  useEffect(() => {
    if (!adsSupported || !userId || premium || loading) return;
    let cancelled = false;
    initAds().then((consent) => {
      if (cancelled) return;
      setConsent(consent);
      if (consent.canRequestAds) mirrorConsent(consent.personalised);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, premium, loading, setConsent]);
}

/** Whether to show ads here and now: free user, mobile, consent flow completed. */
export function useShowAds(): { enabled: boolean; personalised: boolean } {
  const { premium, loading } = usePremium();
  const consent = useAdsStore((s) => s.consent);
  return {
    enabled: adsSupported && !premium && !loading && Boolean(consent?.canRequestAds),
    personalised: Boolean(consent?.personalised),
  };
}

export function useAdPrivacyOptions() {
  const setConsent = useAdsStore((s) => s.set);
  const consent = useAdsStore((s) => s.consent);
  return {
    required: Boolean(consent?.privacyOptionsRequired),
    open: async () => {
      const next = await openAdPrivacyOptions();
      setConsent(next);
      if (next.canRequestAds) await mirrorConsent(next.personalised);
    },
  };
}

async function waitForUnlock(
  userId: string,
  type: string,
  target: string,
  tries = 8,
): Promise<boolean> {
  for (let i = 0; i < tries; i++) {
    const { data } = await supabase
      .from('ad_unlocks')
      .select('id')
      .eq('user_id', userId)
      .eq('unlock_type', type as 'meal_plan' | 'ai_plan')
      .eq('target_id', target)
      .limit(1);
    if (data?.length) return true;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

/**
 * Opt-in rewarded ad (§12): the user taps to watch; "earned" comes from the SDK's reward callback.
 * The unlock and XP are written by the server from Google's SSV callback, so we wait for that row
 * and then refresh what shows XP.
 */
export function useRewardedUnlock() {
  const userId = useSessionStore((s) => s.session?.user.id);
  const { personalised } = useShowAds();
  const queryClient = useQueryClient();
  return useCallback(
    async (type: 'meal_plan' | 'ai_plan', target: string): Promise<RewardOutcome> => {
      if (!userId) return 'failed';
      const outcome = await showRewarded({ userId, type, target }, personalised);
      if (outcome === 'earned') {
        waitForUnlock(userId, type, target).then(() =>
          ['home', 'progress', 'profileOverview', 'adUnlocks'].forEach((key) =>
            queryClient.invalidateQueries({ queryKey: [key] }),
          ),
        );
      }
      return outcome;
    },
    [userId, personalised, queryClient],
  );
}
