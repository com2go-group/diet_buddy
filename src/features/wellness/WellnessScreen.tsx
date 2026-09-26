import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Callout, EmptyState, ErrorState, SkeletonCard, Text } from '@/components';
import { t } from '@/i18n';
import { parseDayKey } from '@/lib/dates';
import { formatShortDate } from '@/lib/format';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { FormMessage } from '../auth/components/FormMessage';
import { usePremium } from '../subscriptions/usePremium';
import { WellnessError } from './api';
import { ConsentCard } from './components/ConsentCard';
import { InsightList } from './components/InsightList';
import { useWellness } from './useWellness';

const close = () => (router.canGoBack() ? router.back() : router.replace('/coach'));
const day = (key: string) => {
  const d = parseDayKey(key);
  return d ? formatShortDate(d) : key;
};

const ERRORS = {
  not_configured: 'wellness.notConfigured',
  rate_limited: 'wellness.rateLimited',
  failed: 'wellness.failed',
} as const;

/** Wellness Insights hub (Premium, separate consent): themes from the user's own coach chats. */
export function WellnessScreen() {
  const { colors } = useTheme();
  const { premium, loading } = usePremium();
  const [deleted, setDeleted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const { query, allow, erase } = useWellness(premium && !deleted);

  const locked = (
    <View className="gap-4">
      <Callout emoji="⭐">{t('wellness.locked')}</Callout>
      <Button label={t('wellness.upgrade')} onPress={() => router.push('/paywall')} />
    </View>
  );

  const body = () => {
    if (loading) return <SkeletonCard lines={4} />;
    if (!premium) return locked;
    if (deleted) {
      return (
        <EmptyState
          emoji="🗑️"
          title={t('wellness.deletedTitle')}
          message={t('wellness.deletedDesc')}
          actionLabel={t('wellness.makeNew')}
          onAction={() => (setDeleted(false), setConfirming(false), erase.reset())}
        />
      );
    }
    if (query.isPending) {
      return (
        <View className="gap-3" aria-busy>
          <Text tone="muted" className="text-center" accessibilityLiveRegion="polite">
            {t('wellness.reading')}
          </Text>
          <SkeletonCard lines={5} />
        </View>
      );
    }
    if (query.isError) {
      const code = query.error instanceof WellnessError ? query.error.code : 'failed';
      if (code === 'premium_required') return locked;
      if (code === 'consent_required') {
        return (
          <ConsentCard
            saving={allow.isPending}
            failed={allow.isError}
            onAgree={() => allow.mutate()}
          />
        );
      }
      return <ErrorState message={t(ERRORS[code])} onRetry={() => query.refetch()} />;
    }
    const data = query.data;
    if (data.status === 'support') {
      return (
        <View className="gap-3">
          <Text variant="heading" accessibilityRole="header" className="text-base">
            💛 {t('wellness.supportTitle')}
          </Text>
          <Text tone="muted">{t('wellness.supportBody')}</Text>
          <Callout emoji="🤝" tone="danger" live>
            {data.note}
          </Callout>
        </View>
      );
    }
    if (data.status === 'not_enough') {
      return (
        <EmptyState
          emoji="💬"
          title={t('wellness.notEnoughTitle')}
          message={t('wellness.notEnoughDesc', { needed: data.needed, count: data.messageCount })}
          actionLabel={t('wellness.openCoach')}
          onAction={() => router.push('/coach')}
        />
      );
    }
    return (
      <View className="gap-4">
        <Text tone="muted">{t('wellness.intro')}</Text>
        <Text variant="caption" tone="muted" className="font-semibold">
          {t('wellness.basedOn', {
            count: data.messagesAnalysed,
            range: `${day(data.periodStart)} – ${day(data.periodEnd)}`,
          })}
        </Text>
        <InsightList insights={data.insights} />
        <Text variant="caption" tone="muted" className="text-center">
          {t('wellness.note')}
        </Text>
        <FormMessage message={erase.isError ? t('wellness.deleteFailed') : undefined} />
        <Button
          label={confirming ? t('wellness.deleteConfirm') : t('wellness.delete')}
          variant="outline"
          loading={erase.isPending}
          onPress={() =>
            confirming
              ? erase.mutate(undefined, { onSuccess: () => setDeleted(true) })
              : setConfirming(true)
          }
        />
        <Button
          label={t('wellness.manage')}
          variant="ghost"
          onPress={() => router.push('/privacy')}
        />
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-5 pb-3 pt-3">
        <View style={{ width: MIN_TOUCH_TARGET }} />
        <Text variant="heading" accessibilityRole="header">
          🌿 {t('wellness.title')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('wellness.close')}
          onPress={close}
          style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
          className="items-center justify-center rounded-full bg-muted active:opacity-70"
        >
          <Feather name="x" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>
      <ScrollView contentContainerClassName="px-5 pb-10">{body()}</ScrollView>
    </SafeAreaView>
  );
}
