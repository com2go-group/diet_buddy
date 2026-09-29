import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useHealthStore, useMonthWorkouts } from '../useHealth';

const mockRead = jest.fn();
jest.mock('@/lib/health', () => ({
  healthPlatform: 'healthkit',
  READ_SCOPES: [],
  readWorkouts: (since: Date) => mockRead(since),
}));

const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);
const NOW = new Date(2026, 8, 30, 12);

describe('useMonthWorkouts', () => {
  beforeEach(() => {
    mockRead.mockReset();
    client.clear();
  });

  it('counts this month’s workouts from the health store', async () => {
    useHealthStore.setState({ connected: true });
    mockRead.mockResolvedValue([{}, {}, {}]);
    const { result } = await renderHook(() => useMonthWorkouts(NOW), { wrapper });
    await waitFor(() => expect(result.current).toBe(3));
    expect(mockRead).toHaveBeenCalledWith(new Date(2026, 8, 1));
  });

  it('is null without a health connection', async () => {
    useHealthStore.setState({ connected: false });
    const { result } = await renderHook(() => useMonthWorkouts(NOW), { wrapper });
    expect(result.current).toBeNull();
    expect(mockRead).not.toHaveBeenCalled();
  });
});
