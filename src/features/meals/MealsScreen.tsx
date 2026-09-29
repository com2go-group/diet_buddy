import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ErrorState, SkeletonCard, Text } from '@/components';
import { t } from '@/i18n';
import { addDays, dayKey, startOfDay } from '@/lib/dates';
import { useTheme } from '@/theme';

import { FormMessage } from '../auth/components/FormMessage';
import { NotificationBell } from '../notifications';
import { OfflineBanner } from '../offline';
import { DayNav, dayLabel } from './components/DayNav';
import { MealsSummary } from './components/MealsSummary';
import { MealTimeline } from './components/MealTimeline';
import { TOMORROW_FROM_HOUR, TomorrowPlan } from './components/TomorrowPlan';
import { totals } from './portion';
import { currentSlot } from './sequence';
import type { MealSlot } from './types';
import { useMealPlanDay } from './useMealPlan';
import { useMealsDay } from './useMeals';

/** The meal for the current time of day (where "Log Food" adds when there's no plan). */
export function slotForHour(hour: number): MealSlot {
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 17) return 'snack';
  return 'dinner';
}

/**
 * Meals tab (CLAUDE.md §7.6): the day's totals and its four meals as one timeline, where each
 * meal shows the AI plan's dish or what was eaten. Tomorrow's plan is one day to the right.
 */
export function MealsScreen() {
  const { colors } = useTheme();
  const now = useMemo(() => new Date(), []);
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const [day, setDay] = useState(today);
  const isToday = dayKey(day) === dayKey(today);
  const isTomorrow = dayKey(day) === dayKey(tomorrow);
  // Tomorrow has no logs; only today and earlier days are loaded.
  const { query, remove } = useMealsDay(isTomorrow ? today : day);
  const planQuery = useMealPlanDay(day);
  const plan = planQuery.data?.plan ?? null;
  const logs = query.data?.logs;
  const next = isToday && plan && logs ? currentSlot(plan, logs) : undefined;

  const openLog = (slot: MealSlot) =>
    router.push({ pathname: '/log-food', params: { slot, date: dayKey(day) } });

  const body = () => {
    if (isTomorrow) return <TomorrowPlan today={today} />;
    if (query.isPending) {
      return (
        <>
          <SkeletonCard lines={3} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </>
      );
    }
    if (query.isError) {
      return <ErrorState message={t('meals.loadFailed')} onRetry={() => query.refetch()} />;
    }
    const { logs, targets } = query.data;
    return (
      <>
        <MealsSummary
          eaten={totals(logs)}
          targetKcal={targets?.calories ?? null}
          title={
            isToday ? t('meals.caloriesToday') : t('meals.caloriesOn', { date: dayLabel(day, now) })
          }
        />
        <MealTimeline
          day={day}
          isToday={isToday}
          logs={logs}
          targetKcal={targets?.calories ?? null}
          onAdd={openLog}
          onDelete={(id) => remove.mutate(id)}
        />
        <FormMessage message={remove.isError ? t('meals.deleteFailed') : undefined} />
        {isToday && (now.getHours() >= TOMORROW_FROM_HOUR || next === null) ? (
          <Button
            label={`🌙 ${t('mealPlan.seeTomorrow')}`}
            variant="outline"
            size="md"
            onPress={() => setDay(tomorrow)}
          />
        ) : null}
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
            onRefresh={() => {
              query.refetch();
              planQuery.refetch();
            }}
            tintColor={colors.primary}
          />
        }
      >
        <View className="flex-row items-center justify-between pb-3 pt-3">
          <Text variant="title" accessibilityRole="header" className="text-[22px]">
            {t('meals.title')}
          </Text>
          <View className="flex-row items-center gap-2">
            {isTomorrow ? null : (
              <Button
                label={t('meals.logFood')}
                size="md"
                variant="outline"
                fullWidth={false}
                onPress={() => openLog(next ?? slotForHour(new Date().getHours()))}
              />
            )}
            <NotificationBell />
          </View>
        </View>
        <DayNav day={day} now={today} maxDay={tomorrow} onChange={setDay} />
        <OfflineBanner />
        {body()}
      </ScrollView>
    </SafeAreaView>
  );
}
