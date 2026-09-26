/**
 * Web build: no ads (AdMob is mobile-only). Same API as index.native.ts.
 */
import type { AdsConsent, RewardOutcome, RewardRequest } from './types';

export type { AdsConsent, RewardOutcome, RewardRequest } from './types';

export const adsSupported = false;

export async function initAds(): Promise<AdsConsent> {
  return { canRequestAds: false, personalised: false, privacyOptionsRequired: false };
}

export async function showInterstitial(_personalised: boolean): Promise<void> {}

export async function showRewarded(
  _req: RewardRequest,
  _personalised: boolean,
): Promise<RewardOutcome> {
  return 'failed';
}

export async function openAdPrivacyOptions(): Promise<AdsConsent> {
  return initAds();
}
