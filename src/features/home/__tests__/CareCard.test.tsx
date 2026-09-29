import { fireEvent, screen } from '@testing-library/react-native';

import { renderScreen } from '@/test/render';

import { CareCard } from '../components/CareCard';
import { useJourneyStore } from '../journeyStore';

jest.mock('expo-router', () => ({ router: { navigate: jest.fn() } }));
const { router } = jest.requireMock('expo-router') as { router: { navigate: jest.Mock } };

const NOW = new Date(2026, 8, 30, 12);
const low = [1, 2, 3].flatMap((d) =>
  ['breakfast', 'dinner'].map((slot, i) => ({
    logged_at: new Date(2026, 8, 30 - d, 8 + i * 10).toISOString(),
    meal_slot: slot,
    calories: 250,
  })),
);

describe('CareCard', () => {
  beforeEach(() => useJourneyStore.setState({ careDismissedAt: {} }));

  it('appears after several very low days and points to support', async () => {
    await renderScreen(<CareCard userId="u1" food={low} targetKcal={1800} now={NOW} />);
    expect(screen.getByText(/How are you doing/)).toBeOnTheScreen();
    expect(screen.getByText(/eating disorder support service/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Talk to the coach'));
    expect(router.navigate).toHaveBeenCalledWith('/coach');
  });

  it('stays hidden with normal days, and for a week once closed', async () => {
    await renderScreen(<CareCard userId="u1" food={low.slice(0, 2)} targetKcal={1800} now={NOW} />);
    expect(screen.queryByTestId('care-card')).toBeNull();

    await renderScreen(<CareCard userId="u1" food={low} targetKcal={1800} now={NOW} />);
    await fireEvent.press(screen.getByText('I’m OK'));
    expect(useJourneyStore.getState().careDismissedAt.u1).toBeDefined();
    expect(screen.queryByTestId('care-card')).toBeNull();
  });
});
