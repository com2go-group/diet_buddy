import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, Text } from '@/components';
import { t } from '@/i18n';
import { careCheckDue, lowIntakeDays, type IntakeLog } from '@/lib/nutrition';

import { useJourneyStore } from '../journeyStore';

/**
 * A caring check-in when several recent days were logged far below the plan (CLAUDE.md §9):
 * no numbers, no praise for eating less, and a pointer to real help. Closing it hides it for a
 * week.
 */
export function CareCard({
  userId,
  food,
  targetKcal,
  now,
}: {
  userId: string;
  food: IntakeLog[];
  targetKcal: number | null;
  now: Date;
}) {
  const dismissedAt = useJourneyStore((s) => s.careDismissedAt[userId]);
  const dismiss = useJourneyStore((s) => s.dismissCare);
  if (!targetKcal || !careCheckDue(lowIntakeDays(food, targetKcal, now), dismissedAt, now)) {
    return null;
  }
  return (
    <View
      className="mb-4 gap-2 rounded-2xl border border-border bg-card p-4"
      accessibilityRole="summary"
      testID="care-card"
    >
      <Text variant="heading" accessibilityRole="header" className="text-base">
        💛 {t('care.title')}
      </Text>
      <Text className="text-[14px] leading-5">{t('care.body')}</Text>
      <Text className="text-[14px] leading-5">{t('care.help')}</Text>
      <Text variant="caption" tone="muted" className="text-[13px]">
        {t('care.maybeLogging')}
      </Text>
      <View className="mt-1 flex-row gap-2">
        <View className="flex-1">
          <Button label={t('care.talk')} size="md" onPress={() => router.navigate('/coach')} />
        </View>
        <View className="flex-1">
          <Button
            label={t('care.dismiss')}
            variant="outline"
            size="md"
            onPress={() => dismiss(userId)}
          />
        </View>
      </View>
    </View>
  );
}
