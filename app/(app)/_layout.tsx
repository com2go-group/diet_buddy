import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="check-in" options={{ presentation: 'modal' }} />
      <Stack.Screen name="log-food" options={{ presentation: 'modal' }} />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="health" />
      <Stack.Screen name="notification-settings" />
      <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
