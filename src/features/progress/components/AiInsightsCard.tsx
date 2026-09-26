import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, ErrorState, SkeletonCard, Text } from '@/components';
import { t } from '@/i18n';

import { usePremium } from '../../subscriptions/usePremium';
import { AiInsightsError, useAiInsights } from '../aiInsights';

/** AI-written insights for Premium users; an upgrade prompt for everyone else. */
export function AiInsightsCard() {
  const { premium } = usePremium();
  const query = useAiInsights(premium);

  const content = () => {
    if (!premium) {
      return (
        <>
          <Text tone="muted" className="text-[13px]">
            ⭐ {t('progress.aiLocked')}
          </Text>
          <Button label={t('progress.aiUpgrade')} onPress={() => router.push('/paywall')} />
        </>
      );
    }
    if (query.isPending) {
      return (
        <View aria-busy className="gap-2">
          <Text tone="muted" className="text-[13px]" accessibilityLiveRegion="polite">
            {t('progress.aiLoading')}
          </Text>
          <SkeletonCard lines={3} />
        </View>
      );
    }
    if (query.isError) {
      const code = query.error instanceof AiInsightsError ? query.error.code : 'failed';
      if (code === 'not_configured') {
        return (
          <Text tone="muted" className="text-[13px]">
            {t('progress.aiNotConfigured')}
          </Text>
        );
      }
      return (
        <ErrorState
          message={t(code === 'premium_required' ? 'progress.aiPending' : 'progress.aiFailed')}
          onRetry={() => query.refetch()}
        />
      );
    }
    if (query.data.notEnoughData || !query.data.insights.length) {
      return (
        <Text tone="muted" className="text-[13px]">
          {t('progress.aiNotEnough', { count: query.data.daysLogged ?? 0 })}
        </Text>
      );
    }
    return (
      <>
        {query.data.insights.map((i) => (
          <View key={i.title} accessible className="flex-row items-start gap-3">
            <Text className="text-2xl leading-8">{i.emoji}</Text>
            <View className="flex-1">
              <Text variant="label" className="mb-1 font-bold text-[15px]">
                {i.title}
              </Text>
              <Text className="text-[14px] leading-5" tone="muted">
                {i.body}
              </Text>
            </View>
          </View>
        ))}
        <Text variant="caption" tone="muted">
          {t('progress.aiBadge')} · {t('progress.aiRefreshes')}
        </Text>
      </>
    );
  };

  return (
    <View className="gap-3 rounded-2xl border border-border bg-card p-4">
      <Text variant="heading" accessibilityRole="header" className="text-base">
        ✨ {t('progress.aiTitle')}
      </Text>
      {content()}
    </View>
  );
}
