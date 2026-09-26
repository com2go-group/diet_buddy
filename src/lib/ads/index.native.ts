import mobileAds, {
  AdEventType,
  AdsConsent as Ump,
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';

import { requestOptions, unitId } from './config';
import type { AdsConsent, RewardOutcome, RewardRequest } from './types';

export type { AdsConsent, RewardOutcome, RewardRequest } from './types';

export const adsSupported = true;

const LOAD_TIMEOUT_MS = 10_000;
let initialised: Promise<AdsConsent> | null = null;

async function readConsent(): Promise<AdsConsent> {
  const info = await Ump.getConsentInfo();
  const choices = info.canRequestAds ? await Ump.getUserChoices() : null;
  return {
    canRequestAds: info.canRequestAds,
    personalised: Boolean(choices?.selectPersonalisedAds),
    privacyOptionsRequired: info.privacyOptionsRequirementStatus === 'REQUIRED',
  };
}

/**
 * Shows Google's UMP consent form when required (EEA/UK), then starts the SDK. No ad is ever
 * requested before this resolves with canRequestAds (CLAUDE.md §12).
 */
export function initAds(): Promise<AdsConsent> {
  initialised ??= (async () => {
    await Ump.gatherConsent().catch(() => undefined);
    const consent = await readConsent();
    if (consent.canRequestAds) await mobileAds().initialize();
    return consent;
  })().catch(() => {
    initialised = null;
    return { canRequestAds: false, personalised: false, privacyOptionsRequired: false };
  });
  return initialised;
}

/** Lets the user change their ad choices (required entry point when UMP says so). */
export async function openAdPrivacyOptions(): Promise<AdsConsent> {
  await Ump.showPrivacyOptionsForm();
  initialised = null;
  return initAds();
}

/** Loads and shows an interstitial; resolves when it closes or fails (never blocks the flow). */
export function showInterstitial(personalised: boolean): Promise<void> {
  const id = unitId('interstitial');
  if (!id) return Promise.resolve();
  return new Promise((resolve) => {
    const ad = InterstitialAd.createForAdRequest(id, requestOptions(personalised));
    const subs: (() => void)[] = [];
    const done = () => {
      clearTimeout(timer);
      subs.forEach((unsub) => unsub());
      resolve();
    };
    const timer = setTimeout(done, LOAD_TIMEOUT_MS);
    subs.push(
      ad.addAdEventListener(AdEventType.LOADED, () => {
        clearTimeout(timer);
        ad.show().catch(done);
      }),
      ad.addAdEventListener(AdEventType.CLOSED, done),
      ad.addAdEventListener(AdEventType.ERROR, done),
    );
    ad.load();
  });
}

/**
 * Loads and shows a rewarded ad the user chose to watch. "earned" only comes from the SDK's reward
 * callback; the server records the unlock from Google's signed SSV callback (admob-ssv).
 */
export function showRewarded(req: RewardRequest, personalised: boolean): Promise<RewardOutcome> {
  const id = unitId('rewarded');
  if (!id) return Promise.resolve('failed');
  return new Promise((resolve) => {
    const ad = RewardedAd.createForAdRequest(id, {
      ...requestOptions(personalised),
      serverSideVerificationOptions: {
        userId: req.userId,
        customData: JSON.stringify({ type: req.type, target: req.target }),
      },
    });
    let earned = false;
    const subs: (() => void)[] = [];
    const finish = (outcome: RewardOutcome) => {
      clearTimeout(timer);
      subs.forEach((unsub) => unsub());
      resolve(outcome);
    };
    const timer = setTimeout(() => finish('failed'), LOAD_TIMEOUT_MS);
    subs.push(
      ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        clearTimeout(timer);
        ad.show().catch(() => finish('failed'));
      }),
      ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      }),
      ad.addAdEventListener(AdEventType.CLOSED, () => finish(earned ? 'earned' : 'dismissed')),
      ad.addAdEventListener(AdEventType.ERROR, () => finish('failed')),
    );
    ad.load();
  });
}
