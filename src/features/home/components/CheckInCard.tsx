import { Pressable, View } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';
import type { Enums } from '@/lib/supabase';
import { accentColor, useTheme } from '@/theme';

/** Daily check-in banner: a call to action before today's check-in, a confirmation after. */
export function CheckInCard({
  mood,
  onStart,
}: {
  mood: Enums<'mood'> | null;
  onStart: () => void;
}) {
  const { scheme } = useTheme();
  const green = accentColor('green', scheme);
  if (mood) {
    return (
      <View className="mb-4 flex-row items-center gap-3 rounded-2xl border border-success/20 bg-success/5 p-4">
        <Text className="text-2xl">🎉</Text>
        <View className="flex-1">
          <Text variant="label" className="font-bold text-[15px]">
            {t('homeScreen.checkedInTitle')}
          </Text>
          <Text variant="caption" tone="muted" className="text-[13px]">
            {t('homeScreen.checkedInDesc', { mood: t(`checkIn.moods.${mood}`).toLowerCase() })}
          </Text>
        </View>
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t('homeScreen.checkInTitle')}. ${t('homeScreen.checkInDesc')}`}
      onPress={onStart}
      className="mb-4 flex-row items-center gap-3 rounded-2xl border border-success/20 bg-success/10 p-4 active:opacity-80"
    >
      <Text className="text-2xl">✅</Text>
      <View className="flex-1">
        <Text variant="label" className="font-bold text-[15px]">
          {t('homeScreen.checkInTitle')}
        </Text>
        <Text variant="caption" tone="muted" className="text-[13px]">
          {t('homeScreen.checkInDesc')}
        </Text>
      </View>
      <Text variant="label" className="font-bold" style={{ color: green }}>
        {t('homeScreen.checkInStart')}
      </Text>
    </Pressable>
  );
}
