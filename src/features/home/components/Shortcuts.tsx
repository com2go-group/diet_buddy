import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';
import { accentColor, useTheme, type Accent } from '@/theme';

import { useFeature } from '../../config';
import { usePremium } from '../../subscriptions/usePremium';

const SHORTCUTS = [
  { key: 'grocery', emoji: '🛒', accent: 'green', route: '/grocery', premium: true },
  { key: 'restaurant', emoji: '🍽️', accent: 'blue', route: '/restaurant', premium: true },
  { key: 'subscribe', emoji: '⭐', accent: 'amber', route: '/paywall', premium: false },
] as const satisfies readonly {
  key: string;
  emoji: string;
  accent: Accent;
  route: string;
  premium: boolean;
}[];

/**
 * Grocery AI, Restaurant mode and Subscribe shortcuts. Free users see a crown on the Premium ones,
 * whose screens explain Premium and lead to the paywall.
 */
export function Shortcuts() {
  const { scheme } = useTheme();
  const { premium } = usePremium();
  const on = {
    grocery: useFeature('grocery'),
    restaurant: useFeature('restaurant'),
    subscribe: true,
  };
  return (
    <View className="mb-4 flex-row gap-2.5">
      {SHORTCUTS.filter((s) => on[s.key]).map((s) => {
        const color = accentColor(s.accent, scheme);
        const crown = s.premium && !premium;
        return (
          <Pressable
            key={s.key}
            accessibilityRole="button"
            accessibilityLabel={
              crown
                ? `${t(`homeScreen.${s.key}`)}, ${t('homeScreen.premiumBadge')}`
                : t(`homeScreen.${s.key}`)
            }
            onPress={() => router.push(s.route)}
            style={{ backgroundColor: `${color}1A`, borderColor: `${color}38` }}
            className="flex-1 items-center gap-1 rounded-2xl border py-3 active:opacity-80"
          >
            {crown ? (
              <View
                importantForAccessibility="no-hide-descendants"
                accessibilityElementsHidden
                className="absolute right-1.5 top-1.5"
              >
                <Text className="text-[13px]">👑</Text>
              </View>
            ) : null}
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
