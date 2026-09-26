import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { GradientFill, Text } from '@/components';
import { t } from '@/i18n';
import { MIN_TOUCH_TARGET } from '@/theme';

import { NotificationBell } from '../../notifications';

function greeting(hour: number) {
  if (hour < 12) return t('homeScreen.morning');
  if (hour < 18) return t('homeScreen.afternoon');
  return t('homeScreen.evening');
}

export function HomeHeader({ name, now }: { name: string; now: Date }) {
  const initial = name.trim().charAt(0).toUpperCase() || '🙂';
  return (
    <View className="flex-row items-center justify-between pb-5 pt-3">
      <View className="flex-1">
        <Text variant="label" tone="muted" className="font-medium">
          {greeting(now.getHours())}
        </Text>
        <Text variant="title" accessibilityRole="header" className="text-[22px] tracking-tight">
          {name.trim()}
        </Text>
        <Text variant="label" tone="muted" className="font-normal">
          {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>
      </View>
      <View className="flex-row items-center gap-2">
        <NotificationBell />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('homeScreen.profile')}
          onPress={() => router.navigate('/profile')}
          style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
          className="items-center justify-center overflow-hidden rounded-full"
        >
          <GradientFill id="avatar" />
          <Text className="font-bold text-white">{initial}</Text>
        </Pressable>
      </View>
    </View>
  );
}
