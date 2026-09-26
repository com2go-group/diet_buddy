import { Linking, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Text } from '@/components';
import { t } from '@/i18n';

const STORE_URL = Platform.select({
  ios: process.env.EXPO_PUBLIC_APP_STORE_URL,
  android: process.env.EXPO_PUBLIC_PLAY_STORE_URL ?? 'market://details?id=com.com2go.dietbuddy',
});

/** Shown instead of the app when an admin raised the minimum version above this build. */
export function UpdateRequired() {
  return (
    <SafeAreaView className="flex-1 justify-center bg-background px-6">
      <View className="items-center gap-3">
        <Text className="text-5xl leading-[64px]">⬆️</Text>
        <Text variant="title" accessibilityRole="header" className="text-center">
          {t('config.updateTitle')}
        </Text>
        <Text tone="muted" className="text-center">
          {t('config.updateBody')}
        </Text>
        {STORE_URL ? (
          <Button label={t('config.updateButton')} onPress={() => Linking.openURL(STORE_URL)} />
        ) : null}
      </View>
    </SafeAreaView>
  );
}
