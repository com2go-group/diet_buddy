import { Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components';
import { t } from '@/i18n';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

type FeatherName = keyof typeof Feather.glyphMap;

export const TABS = [
  { name: 'home', icon: 'home', label: 'tabs.home' },
  { name: 'meals', icon: 'book-open', label: 'tabs.meals' },
  { name: 'coach', icon: 'message-circle', label: 'tabs.coach' },
  { name: 'progress', icon: 'trending-up', label: 'tabs.progress' },
  { name: 'profile', icon: 'user', label: 'tabs.profile' },
] as const satisfies readonly { name: string; icon: FeatherName; label: string }[];

/** Bottom tab bar in the prototype's style: icon + label, amber when active. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      className="flex-row border-t border-border bg-card px-2 pt-1.5"
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
    >
      {state.routes.map((route, index) => {
        const tab = TABS.find((x) => x.name === route.name);
        if (!tab) return null;
        const focused = state.index === index;
        const color = focused ? colors.primaryText : colors.mutedForeground;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            aria-selected={focused}
            accessibilityLabel={t(tab.label)}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={{ minHeight: MIN_TOUCH_TARGET }}
            className="flex-1 items-center justify-center gap-0.5 active:opacity-70"
          >
            <Feather name={tab.icon} size={21} color={color} />
            <Text
              className={`text-[11px] ${focused ? 'font-bold' : 'font-medium'}`}
              style={{ color }}
            >
              {t(tab.label)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
