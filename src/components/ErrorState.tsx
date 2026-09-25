import { View } from 'react-native';

import { t } from '@/i18n';

import { Button } from './Button';
import { Text } from './Text';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
}

export function ErrorState({
  title = t('errors.genericTitle'),
  message = t('errors.genericMessage'),
  onRetry,
  retrying = false,
}: ErrorStateProps) {
  return (
    <View className="items-center gap-2 px-6 py-10">
      <Text variant="display" accessibilityElementsHidden importantForAccessibility="no">
        ⚠️
      </Text>
      {/* Title and message are one announced alert; the retry button stays separately focusable. */}
      <View
        accessible
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        className="items-center gap-2"
      >
        <Text variant="heading" className="text-center">
          {title}
        </Text>
        <Text tone="muted" className="text-center">
          {message}
        </Text>
      </View>
      {onRetry ? (
        <View className="mt-3 w-full">
          <Button
            label={t('common.retry')}
            variant="outline"
            onPress={onRetry}
            loading={retrying}
          />
        </View>
      ) : null}
    </View>
  );
}
