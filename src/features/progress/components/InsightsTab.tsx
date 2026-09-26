import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, EmptyState, Text } from '@/components';
import { t } from '@/i18n';
import { formatDecimal } from '@/lib/format';

import type { Insight } from '../stats';
import { AiInsightsCard } from './AiInsightsCard';

const EMOJI: Record<Insight['kind'], string> = {
  proteinGap: '🥩',
  proteinOnTrack: '💪',
  calorieTiming: '⚡',
  hydrationGap: '💧',
  hydrationOnTrack: '💧',
  weekendCalories: '📅',
  sleepEnergy: '😴',
};

function text(i: Insight): { title: string; body: string } {
  switch (i.kind) {
    case 'proteinGap':
      return {
        title: t('progress.insight_proteinGap_title'),
        body: t('progress.insight_proteinGap', i),
      };
    case 'proteinOnTrack':
      return {
        title: t('progress.insight_proteinOnTrack_title'),
        body: t('progress.insight_proteinOnTrack', i),
      };
    case 'calorieTiming':
      return {
        title: t('progress.insight_calorieTiming_title'),
        body: t('progress.insight_calorieTiming', i),
      };
    case 'hydrationGap':
      return {
        title: t('progress.insight_hydrationGap_title'),
        body: t('progress.insight_hydrationGap', {
          avg: formatDecimal(i.avgMl / 1000),
          target: formatDecimal(i.targetMl / 1000),
        }),
      };
    case 'hydrationOnTrack':
      return {
        title: t('progress.insight_hydrationOnTrack_title'),
        body: t('progress.insight_hydrationOnTrack', { avg: formatDecimal(i.avgMl / 1000) }),
      };
    case 'weekendCalories':
      return {
        title: t('progress.insight_weekendCalories_title'),
        body: t(
          i.diff > 0
            ? 'progress.insight_weekendCaloriesUp'
            : 'progress.insight_weekendCaloriesDown',
          {
            diff: Math.abs(i.diff),
          },
        ),
      };
    case 'sleepEnergy':
      return {
        title: t('progress.insight_sleepEnergy_title'),
        body: t('progress.insight_sleepEnergy', {
          rested: formatDecimal(i.rested),
          short: formatDecimal(i.short),
        }),
      };
  }
}

/** AI insights (Premium), then rule-based patterns from the last 14 days. */
export function InsightsTab({ insights }: { insights: Insight[] }) {
  return (
    <View className="mb-4 gap-3">
      <AiInsightsCard />
      <Button
        label={t('wellness.open')}
        variant="outline"
        onPress={() => router.push('/wellness')}
      />
      {insights.length ? (
        <>
          <Text tone="muted" className="text-[13px]">
            {t('progress.insightsIntro')}
          </Text>
          {insights.map((i) => {
            const { title, body } = text(i);
            return (
              <View
                key={i.kind}
                accessible
                className="flex-row items-start gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <Text className="text-2xl leading-8">{EMOJI[i.kind]}</Text>
                <View className="flex-1">
                  <Text variant="label" className="mb-1 font-bold text-[15px]">
                    {title}
                  </Text>
                  <Text className="text-[14px] leading-5" tone="muted">
                    {body}
                  </Text>
                </View>
              </View>
            );
          })}
        </>
      ) : (
        <EmptyState
          emoji="📊"
          title={t('progress.insightsEmpty')}
          message={t('progress.insightsEmptyDesc')}
        />
      )}
    </View>
  );
}
