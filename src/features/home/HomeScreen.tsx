import { router } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorState, SkeletonCard } from '@/components';
import { t } from '@/i18n';
import { useTheme } from '@/theme';

import { CheckInCard } from './components/CheckInCard';
import { HomeHeader } from './components/HomeHeader';
import { InsightCard } from './components/InsightCard';
import { MacroGrid } from './components/MacroGrid';
import { ScoreCard } from './components/ScoreCard';
import { SectionTitle } from './components/SectionTitle';
import { Shortcuts } from './components/Shortcuts';
import { TodayMeals } from './components/TodayMeals';
import { WaterCard } from './components/WaterCard';
import { WeeklyAdherence } from './components/WeeklyAdherence';
import { homeInsight, summarizeHome } from './summary';
import { useHome } from './useHome';

/** Home dashboard (CLAUDE.md §7.5). */
export function HomeScreen() {
  const { colors } = useTheme();
  const { query, addGlass, removeWater, waterError } = useHome();
  const now = useMemo(() => new Date(), [query.dataUpdatedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  const summary = useMemo(
    () => (query.data ? summarizeHome(query.data, now) : null),
    [query.data, now],
  );

  const body = () => {
    if (query.isPending) {
      return (
        <>
          <SkeletonCard lines={1} />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={4} />
        </>
      );
    }
    if (query.isError || !summary || !query.data) {
      return <ErrorState message={t('homeScreen.loadFailed')} onRetry={() => query.refetch()} />;
    }
    const { today, targets, week, lastWaterLogId } = summary;
    const { profile } = query.data;
    return (
      <>
        <HomeHeader name={profile.name ?? ''} now={now} />
        <ScoreCard score={today.score} streak={profile.streak_days} xp={profile.xp} />
        {targets ? (
          <>
            <SectionTitle
              title={t('homeScreen.nutrition')}
              action={t('homeScreen.details')}
              onAction={() => router.navigate('/meals')}
            />
            <MacroGrid
              macros={[
                {
                  label: t('macros.calories'),
                  current: today.calories,
                  target: targets.calories,
                  unit: ' kcal',
                  accent: 'amber',
                },
                {
                  label: t('macros.protein'),
                  current: today.proteinG,
                  target: targets.proteinG,
                  unit: 'g',
                  accent: 'green',
                },
                {
                  label: t('macros.carbs'),
                  current: today.carbsG,
                  target: targets.carbsG,
                  unit: 'g',
                  accent: 'blue',
                },
                {
                  label: t('macros.fat'),
                  current: today.fatG,
                  target: targets.fatG,
                  unit: 'g',
                  accent: 'violet',
                },
              ]}
            />
            <WaterCard
              waterMl={today.waterMl}
              targetMl={targets.waterMl}
              onAdd={addGlass}
              onRemove={
                lastWaterLogId && !lastWaterLogId.startsWith('pending-')
                  ? () => removeWater(lastWaterLogId)
                  : null
              }
              failed={waterError}
            />
          </>
        ) : (
          <ErrorState message={t('homeScreen.noPlan')} onRetry={() => query.refetch()} />
        )}
        <SectionTitle
          title={t('homeScreen.meals')}
          action={t('homeScreen.logMeal')}
          onAction={() => router.navigate('/meals')}
        />
        <TodayMeals meals={today.meals} onLog={() => router.navigate('/meals')} />
        <CheckInCard mood={today.checkIn?.mood ?? null} onStart={() => router.push('/check-in')} />
        <InsightCard
          kind={homeInsight(summary, now.getHours())}
          onPress={() => router.navigate('/coach')}
        />
        <Shortcuts />
        <SectionTitle
          title={t('homeScreen.weekly')}
          action={t('homeScreen.viewAll')}
          onAction={() => router.navigate('/progress')}
        />
        <WeeklyAdherence week={week} />
      </>
    );
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
        {body()}
      </ScrollView>
    </SafeAreaView>
  );
}
