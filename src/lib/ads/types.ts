export interface AdsConsent {
  /** UMP says ads may be requested (consent obtained or not required). */
  canRequestAds: boolean;
  /** The user allowed personalised ads. */
  personalised: boolean;
  /** An entry point to change the choice must be offered (e.g. in Profile). */
  privacyOptionsRequired: boolean;
}

export type RewardOutcome = 'earned' | 'dismissed' | 'failed';

export interface RewardRequest {
  userId: string;
  type: 'meal_plan' | 'ai_plan';
  target: string;
}
