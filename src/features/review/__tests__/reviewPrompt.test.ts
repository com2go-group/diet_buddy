import * as StoreReview from 'expo-store-review';

import { useJourneyStore } from '../../home/journeyStore';
import { askForReview, reviewDue } from '../reviewPrompt';

const NOW = new Date('2026-09-30T12:00:00Z');
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();

describe('reviewDue', () => {
  it('waits 3 days after onboarding and 90 days between asks', () => {
    expect(reviewDue({ askedAt: undefined, onboardedAt: daysAgo(1) }, NOW)).toBe(false);
    expect(reviewDue({ askedAt: undefined, onboardedAt: daysAgo(4) }, NOW)).toBe(true);
    expect(reviewDue({ askedAt: daysAgo(30), onboardedAt: daysAgo(100) }, NOW)).toBe(false);
    expect(reviewDue({ askedAt: daysAgo(91), onboardedAt: daysAgo(200) }, NOW)).toBe(true);
  });
});

describe('askForReview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useJourneyStore.setState({ reviewAskedAt: {}, onboardedAt: { u1: daysAgo(10) } });
  });

  it('opens the store sheet once, then waits', async () => {
    (StoreReview.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (StoreReview.hasAction as jest.Mock).mockResolvedValue(true);
    expect(await askForReview('u1', 'streak', NOW)).toBe(true);
    expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);
    expect(await askForReview('u1', 'goal', NOW)).toBe(false);
    expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);
  });

  it('does nothing where the store sheet is unavailable', async () => {
    (StoreReview.isAvailableAsync as jest.Mock).mockResolvedValue(false);
    expect(await askForReview('u1', 'story', NOW)).toBe(false);
    expect(useJourneyStore.getState().reviewAskedAt).toEqual({});
  });
});
