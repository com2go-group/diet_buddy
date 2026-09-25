import { View } from 'react-native';

import { Button } from './Button';
import { Text } from './Text';

export interface EmptyStateProps {
  emoji?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  emoji = '🍽️',
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View className="items-center gap-2 px-6 py-10">
      <Text variant="display" accessibilityElementsHidden importantForAccessibility="no">
        {emoji}
      </Text>
      <Text variant="heading" className="text-center">
        {title}
      </Text>
      {message ? (
        <Text tone="muted" className="text-center">
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <View className="mt-3 w-full">
          <Button label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}
