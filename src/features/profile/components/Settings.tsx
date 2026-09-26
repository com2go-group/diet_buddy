import { Feather } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

/** Titled group of settings rows. */
export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mb-5">
      <Text
        variant="caption"
        tone="muted"
        accessibilityRole="header"
        className="mb-2 px-1 font-bold uppercase tracking-wider"
      >
        {title}
      </Text>
      <View className="overflow-hidden rounded-2xl border border-border bg-card">{children}</View>
    </View>
  );
}

export function SettingsRow({
  icon,
  label,
  value,
  onPress,
  last = false,
  destructive = false,
}: {
  icon: keyof typeof Feather.glyphMap | string;
  label: string;
  value?: string;
  onPress?: () => void;
  last?: boolean;
  destructive?: boolean;
}) {
  const { colors } = useTheme();
  const isGlyph = icon in Feather.glyphMap;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={value ? `${label}, ${value}` : label}
      disabled={!onPress}
      onPress={onPress}
      style={{ minHeight: MIN_TOUCH_TARGET + 12 }}
      className={`flex-row items-center gap-3 px-4 py-3 active:bg-muted ${last ? '' : 'border-b border-border'}`}
    >
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-muted">
        {isGlyph ? (
          <Feather
            name={icon as keyof typeof Feather.glyphMap}
            size={17}
            color={destructive ? colors.destructive : colors.foreground}
          />
        ) : (
          <Text className="text-base leading-5">{icon}</Text>
        )}
      </View>
      <View className="flex-1">
        <Text
          variant="label"
          tone={destructive ? 'destructive' : 'default'}
          className="font-semibold text-[15px]"
        >
          {label}
        </Text>
        {value ? (
          <Text variant="caption" tone="muted" className="text-[13px]">
            {value}
          </Text>
        ) : null}
      </View>
      {onPress ? <Feather name="chevron-right" size={16} color={colors.mutedForeground} /> : null}
    </Pressable>
  );
}
