import { renderHook } from '@testing-library/react-native';

import { useJourneyStore } from '../../home/journeyStore';
import { dailyAdDue, useDailyMealsAd } from '../useDailyMealsAd';

const mockShow = jest.fn(async (_personalised: boolean) => undefined);
const mockAds = { enabled: true, personalised: false };
jest.mock('@/lib/ads', () => ({ showInterstitial: (p: boolean) => mockShow(p) }));
jest.mock('../../ads', () => ({ useShowAds: () => mockAds }));
jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void) => {
    const { useEffect } = jest.requireActual<typeof import('react')>('react');
    useEffect(effect, [effect]);
  },
}));
jest.mock('../../auth/sessionStore', () => ({
  useSessionStore: (pick: (s: object) => unknown) => pick({ session: { user: { id: 'u1' } } }),
}));

const NOON = new Date(2026, 8, 29, 12);

describe('dailyAdDue', () => {
  const base = { enabled: true, shownOn: undefined, onboardedAt: undefined, now: NOON };
  it('shows once per local day to free users with ads on', () => {
    expect(dailyAdDue(base)).toBe(true);
    expect(dailyAdDue({ ...base, shownOn: '2026-09-29' })).toBe(false);
    expect(dailyAdDue({ ...base, shownOn: '2026-09-28' })).toBe(true);
    expect(dailyAdDue({ ...base, enabled: false })).toBe(false);
  });
  it('skips the day onboarding finished', () => {
    const onboarded = new Date(2026, 8, 29, 9).toISOString();
    expect(dailyAdDue({ ...base, onboardedAt: onboarded })).toBe(false);
    const earlier = new Date(2026, 8, 27, 9).toISOString();
    expect(dailyAdDue({ ...base, onboardedAt: earlier })).toBe(true);
  });
});

describe('useDailyMealsAd', () => {
  beforeEach(() => {
    mockShow.mockClear();
    mockAds.enabled = true;
    useJourneyStore.setState({ mealsAdShownOn: {}, onboardedAt: {} });
  });

  it('shows the interstitial on the first visit of the day only', async () => {
    const first = await renderHook(() => useDailyMealsAd());
    expect(mockShow).toHaveBeenCalledTimes(1);
    expect(mockShow).toHaveBeenCalledWith(false);
    first.unmount();
    await renderHook(() => useDailyMealsAd());
    expect(mockShow).toHaveBeenCalledTimes(1);
  });

  it('never shows without ads (Premium, web, no consent)', async () => {
    mockAds.enabled = false;
    await renderHook(() => useDailyMealsAd());
    expect(mockShow).not.toHaveBeenCalled();
    expect(useJourneyStore.getState().mealsAdShownOn).toEqual({});
  });
});
