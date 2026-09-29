import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Text } from '@/components';
import { t } from '@/i18n';
import { formatNumber } from '@/lib/format';
import { haptics } from '@/lib/haptics';

import { FormMessage } from '../auth/components/FormMessage';
import { applyMaintenanceStep, loadGoalJourney, maintenancePlan } from './api';
import { journeyState } from './state';

export const goalJourneyKey = (userId: string) => ['goalJourney', userId] as const;

/**
 * Goal reached → a sustainable maintenance plan (decision log 2026-09-30): a celebration and a
 * switch to maintenance calories in gentle steps, the later steps, and a kind nudge if the trend
 * drifts well above the kept weight.
 */
export function GoalJourneyCard({ userId, now }: { userId: string; now: Date }) {
  const queryClient = useQueryClient();
  const [applied, setApplied] = useState<number | null>(null);
  const query = useQuery({
    queryKey: goalJourneyKey(userId),
    queryFn: () => loadGoalJourney(userId, now),
  });
  const state = query.data ? journeyState(query.data, now) : null;
  // How far maintenance is, to phrase the step (and to hide a step that has nothing left).
  const preview = useQuery({
    queryKey: ['maintenancePreview', userId, query.data?.plan?.dailyCalories],
    enabled: state === 'reached' || state === 'nextStep',
    queryFn: () => maintenancePlan(userId, query.data!.plan!.dailyCalories, now),
  });
  const apply = useMutation({
    mutationFn: () => applyMaintenanceStep(userId, query.data!, now),
    onSuccess: async (kcal) => {
      haptics.success();
      setApplied(kcal);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: goalJourneyKey(userId) }),
        queryClient.invalidateQueries({ queryKey: ['home'] }),
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
      ]);
    },
  });

  if (applied !== null) {
    return (
      <View className="mb-4 gap-2 rounded-2xl border border-success/25 bg-success/10 p-4">
        <Text
          variant="heading"
          accessibilityRole="header"
          className="text-base"
          accessibilityLiveRegion="polite"
        >
          ✅ {t('goalJourney.appliedTitle')}
        </Text>
        <Text className="text-[14px]">
          {t('goalJourney.applied', { kcal: formatNumber(applied) })}
        </Text>
      </View>
    );
  }
  if (!state || !query.data) return null;
  const step = preview.data;
  const current = query.data.plan!.dailyCalories;
  if (state === 'nextStep' && step && step.step.plan.dailyCalories <= current) return null;

  if (state === 'regain') {
    return (
      <View className="mb-4 gap-2 rounded-2xl border border-border bg-card p-4">
        <Text variant="heading" accessibilityRole="header" className="text-base">
          🌱 {t('goalJourney.regainTitle')}
        </Text>
        <Text className="text-[14px]">{t('goalJourney.regain')}</Text>
        <Button
          label={t('goalJourney.newGoal')}
          variant="outline"
          size="md"
          onPress={() => router.push('/edit-goal')}
        />
      </View>
    );
  }

  const stepText =
    step && step.step.plan.dailyCalories > current
      ? t(
          step.step.plan.dailyCalories >= step.maintenanceKcal
            ? 'goalJourney.stepFinal'
            : 'goalJourney.step',
          {
            from: formatNumber(current),
            to: formatNumber(step.step.plan.dailyCalories),
            maintenance: formatNumber(step.maintenanceKcal),
          },
        )
      : null;

  return (
    <View
      className="mb-4 gap-2 rounded-2xl border border-success/25 bg-success/10 p-4"
      testID="goal-journey"
    >
      <Text variant="heading" accessibilityRole="header" className="text-base">
        {state === 'reached'
          ? `🎉 ${t('goalJourney.reachedTitle')}`
          : `📈 ${t('goalJourney.nextTitle')}`}
      </Text>
      <Text className="text-[14px] leading-5">
        {state === 'reached' ? t('goalJourney.reached') : t('goalJourney.next')}
      </Text>
      {stepText ? <Text className="font-semibold text-[14px]">{stepText}</Text> : null}
      <FormMessage message={apply.isError ? t('goalJourney.failed') : undefined} />
      <Button
        label={state === 'reached' ? t('goalJourney.switch') : t('goalJourney.applyStep')}
        size="md"
        loading={apply.isPending}
        disabled={!step}
        onPress={() => apply.mutate()}
      />
      {state === 'reached' ? (
        <Button
          label={t('goalJourney.newGoal')}
          variant="ghost"
          size="md"
          onPress={() => router.push('/edit-goal')}
        />
      ) : null}
    </View>
  );
}
