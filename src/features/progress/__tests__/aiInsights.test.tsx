import { FunctionsHttpError } from '@supabase/supabase-js';
import { fireEvent, screen } from '@testing-library/react-native';

import { supabase } from '@/lib/supabase';
import { renderScreen } from '@/test/render';

import { useStorePremium } from '../../subscriptions/usePremium';
import { AiInsightsCard } from '../components/AiInsightsCard';

jest.mock('@/lib/supabase', () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    single: async () => ({ data: { is_premium: false }, error: null }),
  };
  return {
    ...jest.requireActual('@/lib/supabase'),
    supabase: { from: () => chain, functions: { invoke: jest.fn() } },
  };
});
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const { router } = jest.requireMock('expo-router') as { router: { push: jest.Mock } };
const invoke = supabase.functions.invoke as jest.Mock;
const httpError = (code: string) =>
  new FunctionsHttpError(new Response(JSON.stringify({ error: code }), { status: 503 }));

beforeEach(() => {
  jest.clearAllMocks();
  useStorePremium.setState({ premium: true });
});

describe('AiInsightsCard', () => {
  it('shows today’s insights with the local time zone and a disclaimer', async () => {
    invoke.mockResolvedValue({
      data: {
        day: '2026-09-27',
        insights: [{ emoji: '💧', title: 'Hydration dips', body: 'Saturdays were drier.' }],
      },
      error: null,
    });
    await renderScreen(<AiInsightsCard />);
    expect(await screen.findByText('Hydration dips')).toBeOnTheScreen();
    expect(screen.getByText(/not medical advice/)).toBeOnTheScreen();
    expect(invoke).toHaveBeenCalledWith('generate-insights', {
      body: { tzOffsetMinutes: -new Date().getTimezoneOffset() },
    });
  });

  it('asks for more logging first', async () => {
    invoke.mockResolvedValue({
      data: { day: '2026-09-27', insights: [], notEnoughData: true, daysLogged: 3 },
      error: null,
    });
    await renderScreen(<AiInsightsCard />);
    expect(
      await screen.findByText(/at least 5 days to get AI insights \(3 so far\)/),
    ).toBeOnTheScreen();
  });

  it('explains when the server is not set up, and offers a retry on other errors', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: httpError('not_configured') });
    await renderScreen(<AiInsightsCard />);
    expect(await screen.findByText(/aren’t set up on this server/)).toBeOnTheScreen();
  });

  it('shows an error with retry', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: new Error('network') });
    await renderScreen(<AiInsightsCard />);
    expect(
      await screen.findByText('We couldn’t create your insights right now.'),
    ).toBeOnTheScreen();
  });

  it('offers Premium to free users without calling the function', async () => {
    useStorePremium.setState({ premium: false });
    await renderScreen(<AiInsightsCard />);
    await fireEvent.press(await screen.findByRole('button', { name: 'See Premium' }));
    expect(router.push).toHaveBeenCalledWith('/paywall');
    expect(invoke).not.toHaveBeenCalled();
  });
});
