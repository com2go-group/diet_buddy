export interface AdsConsent {
  /** UMP says ads may be requested (consent obtained or not required). */
  canRequestAds: boolean;
  /** The user allowed personalised ads. */
  personalised: boolean;
  /** An entry point to change the choice must be offered (e.g. in Profile). */
  privacyOptionsRequired: boolean;
}

export type RewardOutcome = 'earned' | 'dismissed' | 'failed';

/** What a rewarded video unlocks (`ad_unlocks.unlock_type`, recorded by admob-ssv). */
export type UnlockType = 'meal_plan' | 'ai_plan' | 'ai_boost';

export interface RewardRequest {
  userId: string;
  type: UnlockType;
  target: string;
}
