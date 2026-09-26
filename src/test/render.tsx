import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useSessionStore } from '@/features/auth/sessionStore';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/**
 * Renders a screen the way the app does: safe area, a fresh query client (no retries, and no
 * garbage-collection timers that would keep Jest running) and a signed-in user.
 */
export async function renderScreen(ui: ReactElement, userId = 'user-1') {
  useSessionStore.setState({ session: { user: { id: userId } } } as never);
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { gcTime: Infinity },
    },
  });
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </SafeAreaProvider>,
  );
  return client;
}
