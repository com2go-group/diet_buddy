import { Feather } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Text } from '@/components';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

/** Section heading with an optional "Details ›" style link on the right. */
export function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View className="mb-1 flex-row items-center justify-between">
      <Text variant="heading" accessibilityRole="header" className="font-bold text-base">
        {title}
      </Text>
      {action && onAction ? (
        <Pressable
          accessibilityRole="link"
          onPress={onAction}
          style={{ minHeight: MIN_TOUCH_TARGET }}
          className="flex-row items-center gap-1 active:opacity-70"
        >
          <Text variant="label" tone="primary" className="font-semibold">
            {action}
          </Text>
          <Feather name="chevron-right" size={14} color={colors.primaryText} />
        </Pressable>
      ) : null}
    </View>
  );
}
