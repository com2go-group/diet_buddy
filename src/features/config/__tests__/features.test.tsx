import { screen, waitFor } from '@testing-library/react-native';

import { renderScreen } from '@/test/render';

import { Shortcuts } from '../../home/components/Shortcuts';

jest.mock('@/lib/supabase', () => ({
  ...jest.requireActual('@/lib/supabase'),
  supabase: {
    from: () => ({
      select: async () => ({
        data: [
          { key: 'feature_grocery', value: false },
          { key: 'feature_restaurant', value: true },
        ],
        error: null,
      }),
    }),
  },
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

describe('feature switches', () => {
  it('hides what an admin switched off and keeps the rest', async () => {
    await renderScreen(<Shortcuts />);
    expect(await screen.findByRole('button', { name: 'Restaurant' })).toBeOnTheScreen();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Grocery AI' })).toBeNull());
    expect(screen.getByRole('button', { name: 'Subscribe' })).toBeOnTheScreen();
  });
});
