import { View } from 'react-native';

import { Text } from '@/components';

export function StatTile({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      className="flex-1 rounded-2xl border border-border bg-card p-3.5"
    >
      <Text className="text-[22px] leading-7">{emoji}</Text>
      <Text className="mt-1 font-extrabold text-xl leading-6">{value}</Text>
      <Text variant="caption" tone="muted" className="mt-0.5">
        {label}
      </Text>
    </View>
  );
}
