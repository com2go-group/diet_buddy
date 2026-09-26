import { Feather } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { GradientFill, Text } from '@/components';
import { t } from '@/i18n';
import { useTheme } from '@/theme';

import type { InsightKind } from '../summary';

/** Coach tip card; opens the Coach tab. */
export function InsightCard({ kind, onPress }: { kind: InsightKind; onPress: () => void }) {
  const { colors } = useTheme();
  const message = t(`homeScreen.insight_${kind}`);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t('homeScreen.insightTitle')}. ${message}`}
      onPress={onPress}
      className="mb-4 flex-row items-center gap-3 rounded-2xl border border-primary/25 bg-primary/10 p-4 active:opacity-80"
    >
      <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-xl">
        <GradientFill id="insight" />
        <Feather name="zap" size={18} color="#FFFFFF" />
      </View>
      <View className="flex-1">
        <Text variant="label" className="font-bold text-[15px]">
          {t('homeScreen.insightTitle')}
        </Text>
        <Text variant="caption" tone="muted" className="text-[13px]">
          {message}
        </Text>
      </View>
      <Feather name="chevron-right" size={16} color={colors.primaryText} />
    </Pressable>
  );
}
