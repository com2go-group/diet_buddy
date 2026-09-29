import * as StoreReview from 'expo-store-review';
import { Platform } from 'react-native';

import { useJourneyStore } from '../home/journeyStore';

/**
 * The store's own rating prompt at good moments (decision log 2026-09-30): a streak milestone,
 * reaching the goal, sharing the weekly story. Never in the first 3 days after onboarding and
 * at most once every 90 days; Apple and Google also cap how often the sheet actually appears.
 */
export type ReviewMoment = 'streak' | 'goal' | 'story';

export const REVIEW_GAP_DAYS = 90;
export const REVIEW_AFTER_ONBOARDING_DAYS = 3;
/** Streak lengths that count as a good moment. */
export const REVIEW_STREAKS = [7, 14, 30, 60, 100];

const DAY = 86_400_000;

export function reviewDue(
  opts: { askedAt: string | undefined; onboardedAt: string | undefined },
  now: Date,
): boolean {
  if (
    opts.onboardedAt &&
    now.getTime() - Date.parse(opts.onboardedAt) < REVIEW_AFTER_ONBOARDING_DAYS * DAY
  ) {
    return false;
  }
  return !opts.askedAt || now.getTime() - Date.parse(opts.askedAt) >= REVIEW_GAP_DAYS * DAY;
}

/** Asks for a rating if the moment is right; true when the store sheet was requested. */
export async function askForReview(
  userId: string,
  _moment: ReviewMoment,
  now = new Date(),
): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const journey = useJourneyStore.getState();
  if (
    !reviewDue(
      { askedAt: journey.reviewAskedAt[userId], onboardedAt: journey.onboardedAt[userId] },
      now,
    )
  ) {
    return false;
  }
  try {
    if (!(await StoreReview.isAvailableAsync()) || !(await StoreReview.hasAction())) return false;
    journey.reviewAsked(userId, now);
    await StoreReview.requestReview();
    return true;
  } catch {
    return false;
  }
}
