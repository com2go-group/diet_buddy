import { Stack } from 'expo-router';

import { usePurchasesSetup } from '@/features/subscriptions';

export default function AppLayout() {
  usePurchasesSetup();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="check-in" options={{ presentation: 'modal' }} />
      <Stack.Screen name="log-food" options={{ presentation: 'modal' }} />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
