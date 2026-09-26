import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';
import { accentColor, useTheme, type Accent } from '@/theme';

const SHORTCUTS = [
  { key: 'grocery', emoji: '🛒', accent: 'green', route: '/grocery' },
  { key: 'restaurant', emoji: '🍽️', accent: 'blue', route: '/restaurant' },
  { key: 'subscribe', emoji: '⭐', accent: 'amber', route: '/paywall' },
] as const satisfies readonly { key: string; emoji: string; accent: Accent; route: string }[];

/** Grocery AI, Restaurant mode and Subscribe shortcuts (the first two explain Premium to free users). */
export function Shortcuts() {
  const { scheme } = useTheme();
  return (
    <View className="mb-4 flex-row gap-2.5">
      {SHORTCUTS.map((s) => {
        const color = accentColor(s.accent, scheme);
        return (
          <Pressable
            key={s.key}
            accessibilityRole="button"
            accessibilityLabel={t(`homeScreen.${s.key}`)}
            onPress={() => router.push(s.route)}
            style={{ backgroundColor: `${color}1A`, borderColor: `${color}38` }}
            className="flex-1 items-center gap-1 rounded-2xl border py-3 active:opacity-80"
          >
            <Text className="text-xl">{s.emoji}</Text>
            <Text variant="caption" className="font-bold" style={{ color }}>
              {t(`homeScreen.${s.key}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
