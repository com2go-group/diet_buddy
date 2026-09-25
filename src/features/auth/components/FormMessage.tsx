import { View } from 'react-native';

import { Text } from '@/components';

/** Error or info banner above a form's submit button. */
export function FormMessage({
  message,
  tone = 'error',
}: {
  message?: string;
  tone?: 'error' | 'info';
}) {
  if (!message) return null;
  return (
    <View
      accessible
      accessibilityRole={tone === 'error' ? 'alert' : 'text'}
      accessibilityLiveRegion="polite"
      className={
        tone === 'error'
          ? 'rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3'
          : 'rounded-md border border-success/20 bg-success/10 px-4 py-3'
      }
    >
      <Text variant="label" tone={tone === 'error' ? 'destructive' : 'success'}>
        {tone === 'error' ? '⚠️ ' : '✓ '}
        {message}
      </Text>
    </View>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <View className="flex-row items-center gap-3" accessibilityElementsHidden>
      <View className="h-px flex-1 bg-border" />
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <View className="h-px flex-1 bg-border" />
    </View>
  );
}
