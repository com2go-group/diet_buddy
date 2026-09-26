import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorState, SegmentedControl, SkeletonCard, Text } from '@/components';
import { AppBanner } from '@/features/ads';
import { t } from '@/i18n';
import { useTheme } from '@/theme';

import { NotificationBell } from '../notifications';
import { AchievementsTab } from './components/AchievementsTab';
import { BodyTab } from './components/BodyTab';
import { InsightsTab } from './components/InsightsTab';
import { OverviewTab } from './components/OverviewTab';
import { insights } from './stats';
import { useProgress } from './useProgress';

type Section = 'overview' | 'body' | 'achievements' | 'insights';

/** Progress tab (CLAUDE.md §7.8): trends, body metrics, achievements and insights. */
export function ProgressScreen() {
  const { colors } = useTheme();
  const query = useProgress();
  const [section, setSection] = useState<Section>('overview');
  const now = useMemo(() => new Date(), [query.dataUpdatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const body = () => {
    if (query.isPending) {
      return (
        <>
          <SkeletonCard lines={2} />
          <SkeletonCard lines={4} />
          <SkeletonCard lines={3} />
        </>
      );
    }
    if (query.isError) {
      return <ErrorState message={t('progress.loadFailed')} onRetry={() => query.refetch()} />;
    }
    const data = query.data;
    switch (section) {
      case 'overview':
        return <OverviewTab data={data} now={now} />;
      case 'body':
        return <BodyTab metrics={data.metrics} units={data.profile.units} />;
      case 'achievements':
        return <AchievementsTab achievements={data.achievements} />;
      case 'insights':
        return (
          <InsightsTab
            insights={insights(
              data,
              data.plan ? { proteinG: data.plan.proteinG, waterMl: data.plan.waterMl } : null,
              now,
            )}
          />
        );
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="px-5 pb-10"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => query.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        <View className="flex-row items-center justify-between pb-4 pt-3">
          <Text variant="title" accessibilityRole="header" className="text-[22px]">
            {t('progress.title')}
          </Text>
          <NotificationBell />
        </View>
        <SegmentedControl
          accessibilityLabel={t('progress.tabs')}
          className="mb-5"
          value={section}
          onChange={setSection}
          options={[
            { value: 'overview', label: t('progress.overview') },
            { value: 'body', label: t('progress.body') },
            { value: 'achievements', label: t('progress.achievements') },
            { value: 'insights', label: t('progress.insights') },
          ]}
        />
        {body()}
        <AppBanner />
      </ScrollView>
    </SafeAreaView>
  );
}
