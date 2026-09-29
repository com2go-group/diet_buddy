import { View } from 'react-native';

import { Button, Card, Text } from '@/components';
import { t } from '@/i18n';
import { formatDecimal, formatNumber } from '@/lib/format';

import { FormMessage } from '../auth/components/FormMessage';
import { usePlanReview } from './usePlanReview';

/**
 * Every two weeks, when the weight trend and logged calories show the plan's estimate was off,
 * suggests a new daily target (within the safety floor and ±300 kcal). The user decides.
 */
export function PlanCheckCard({ now }: { now: Date }) {
  const { suggestion, accept, dismiss } = usePlanReview(now);
  if (!suggestion) return null;
  const rate = formatDecimal(Math.abs(suggestion.weeklyKg));
  return (
    <Card className="mb-4 gap-2 border border-primary/30">
      <Text variant="heading" accessibilityRole="header" className="text-base">
        📊 {t('planCheck.title')}
      </Text>
      <Text className="text-[14px] leading-5">
        {t(`planCheck.${suggestion.reason}`, {
          rate,
          tdee: formatNumber(suggestion.estimatedTdee),
          kcal: formatNumber(suggestion.suggested),
        })}
      </Text>
      <Text variant="caption" tone="muted">
        {t('planCheck.note')}
      </Text>
      <FormMessage message={accept.isError ? t('planCheck.failed') : undefined} />
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button
            label={t('planCheck.update', { kcal: formatNumber(suggestion.suggested) })}
            size="md"
            loading={accept.isPending}
            onPress={() => accept.mutate()}
          />
        </View>
        <View className="flex-1">
          <Button label={t('planCheck.notNow')} variant="outline" size="md" onPress={dismiss} />
        </View>
      </View>
    </Card>
  );
}
