import '../global.css';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import {
  DarkTheme,
  DefaultTheme,
  SplashScreen,
  Stack,
  ThemeProvider,
  type Theme,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { QueryClientProvider } from '@tanstack/react-query';

import { Button, ErrorState } from '@/components';
import { ONBOARDING_ROUTES, useAppRoute } from '@/features/account';
import { signOut, startSessionListener, useSessionStore } from '@/features/auth';
import { t } from '@/i18n';
import { queryClient } from '@/lib/query/queryClient';
import { palette, useApplyThemePreference, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function navigationTheme(scheme: 'light' | 'dark'): Theme {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const c = palette[scheme];
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: c.primary,
      background: c.background,
      card: c.card,
      text: c.foreground,
      border: c.border,
      notification: c.destructive,
    },
  };
}

export default function RootLayout() {
  useApplyThemePreference();
  const { scheme, colors } = useTheme();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => undefined);
  }, [colors.background]);

  useEffect(() => startSessionListener(), []);
  const { session, initialized } = useSessionStore();
  const ready = (fontsLoaded || Boolean(fontError)) && initialized;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={navigationTheme(scheme)}>
            <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
            <RootNavigator signedIn={session !== null} />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Guards decide what is reachable. When one flips (sign in, sign out, reset code accepted,
 * onboarding finished) Expo Router redirects to the first allowed route, which index.tsx resolves.
 */
function RootNavigator({ signedIn }: { signedIn: boolean }) {
  const { route, retry } = useAppRoute();

  // Never show one user's cached data to the next.
  useEffect(() => {
    if (!signedIn) queryClient.clear();
  }, [signedIn]);

  if (route === 'loading') return null;
  if (route === 'error') {
    return (
      <SafeAreaView className="flex-1 justify-center gap-2 bg-background px-5">
        <ErrorState onRetry={retry} />
        <Button
          variant="ghost"
          label={t('auth.signOut')}
          onPress={() => signOut().catch(() => undefined)}
        />
      </SafeAreaView>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={route === 'welcome'}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={route === 'new-password'}>
        <Stack.Screen name="new-password" />
      </Stack.Protected>
      <Stack.Protected guard={ONBOARDING_ROUTES.includes(route)}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={route === 'home'}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={__DEV__}>
        <Stack.Screen name="design-system" />
      </Stack.Protected>
    </Stack>
  );
}
