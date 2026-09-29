import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorState, SkeletonCard } from '@/components';
import { AppBanner } from '@/features/ads';
import { ActivityCard } from '@/features/health';
import { t } from '@/i18n';
import { purchasesAvailable } from '@/lib/purchases';
import { useTheme } from '@/theme';

import { useSessionStore } from '../auth/sessionStore';
import { PlanCheckCard } from '../planReview/PlanCheckCard';
import { openPaywall } from '../subscriptions/paywallRoute';
import { usePremium } from '../subscriptions/usePremium';
import { CheckInCard } from './components/CheckInCard';
import { FirstDayChecklist } from './components/FirstDayChecklist';
import { HomeHeader } from './components/HomeHeader';
import { InsightCard } from './components/InsightCard';
import { MacroGrid } from './components/MacroGrid';
import { ScoreCard } from './components/ScoreCard';
import { SectionTitle } from './components/SectionTitle';
import { Shortcuts } from './components/Shortcuts';
import { TodayMeals } from './components/TodayMeals';
import { WaterCard } from './components/WaterCard';
import { WeeklyAdherence } from './components/WeeklyAdherence';
import { useJourneyStore } from './journeyStore';
import { homeInsight, summarizeHome } from './summary';
import { useHome } from './useHome';

/**
 * Right after onboarding, free users see the trial offer once (it can always be closed with
 * "Continue free"); Premium users and builds without store purchases never do.
 */
function useWelcomeOffer(userId: string | undefined) {
  const pending = useJourneyStore((s) => (userId ? s.welcomeOfferPending[userId] : false));
  const shown = useJourneyStore((s) => s.welcomeOfferShown);
  const { premium, loading } = usePremium();
  useEffect(() => {
    if (!userId || !pending || loading) return;
    shown(userId);
    if (!premium && purchasesAvailable()) openPaywall(undefined, { welcome: true });
  }, [userId, pending, loading, premium, shown]);
}

/** Home dashboard (CLAUDE.md §7.5). */
export function HomeScreen() {
  const { colors } = useTheme();
  const userId = useSessionStore((s) => s.session?.user.id);
  const { query, addGlass, removeWater, waterError } = useHome();
  useWelcomeOffer(userId);
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
        {userId ? (
          <FirstDayChecklist userId={userId} data={query.data} now={now} onAddGlass={addGlass} />
        ) : null}
        <PlanCheckCard now={now} />
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
        <ActivityCard />
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
        <AppBanner />
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
