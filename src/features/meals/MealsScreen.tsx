import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, EmptyState, ErrorState, SkeletonCard, Text } from '@/components';
import { t } from '@/i18n';
import { dayKey, startOfDay } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { FormMessage } from '../auth/components/FormMessage';
import { NotificationBell } from '../notifications';
import { DayNav, dayLabel } from './components/DayNav';
import { FoodLogRow } from './components/FoodLogRow';
import { MealsSummary } from './components/MealsSummary';
import { SlotTabs } from './components/SlotTabs';
import { MEAL_SLOTS, SLOT_EMOJI, slotTarget, totals } from './portion';
import type { MealSlot } from './types';
import { useMealsDay } from './useMeals';

/** Default tab: the meal for the current time of day. */
function slotForHour(hour: number): MealSlot {
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 17) return 'snack';
  return 'dinner';
}

/** Meals tab (CLAUDE.md §7.6): a day's logged food by meal, with totals against the plan. */
export function MealsScreen() {
  const { colors } = useTheme();
  const now = useMemo(() => new Date(), []);
  const [day, setDay] = useState(() => startOfDay(now));
  const [slot, setSlot] = useState<MealSlot>(() => slotForHour(now.getHours()));
  const { query, remove } = useMealsDay(day);

  const openLog = (forSlot: MealSlot) =>
    router.push({ pathname: '/log-food', params: { slot: forSlot, date: dayKey(day) } });

  const body = () => {
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
    const slotLogs = logs.filter((l) => l.meal_slot === slot);
    const slotKcal = totals(slotLogs).kcal;
    const target = targets ? slotTarget(targets.calories, slot) : null;
    const counts = Object.fromEntries(
      MEAL_SLOTS.map((s) => [s, logs.filter((l) => l.meal_slot === s).length]),
    ) as Record<MealSlot, number>;
    const isToday = dayKey(day) === dayKey(now);
    return (
      <>
        <MealsSummary
          eaten={totals(logs)}
          targetKcal={targets?.calories ?? null}
          title={
            isToday ? t('meals.caloriesToday') : t('meals.caloriesOn', { date: dayLabel(day, now) })
          }
        />
        <SlotTabs value={slot} onChange={setSlot} counts={counts} />
        <View className="mb-3 flex-row items-center justify-between">
          <View className="flex-1">
            <Text variant="heading" accessibilityRole="header" className="text-base">
              {t(`homeScreen.${slot}`)}
            </Text>
            <Text variant="caption" tone="muted" className="text-[13px]">
              {target === null
                ? `${formatNumber(slotKcal)} kcal`
                : t('meals.slotSummary', {
                    current: formatNumber(slotKcal),
                    target: formatNumber(target),
                  })}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('meals.addTo', { slot: t(`homeScreen.${slot}`) })}
            onPress={() => openLog(slot)}
            style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
            className="items-center justify-center rounded-xl bg-primary/10 active:opacity-70"
          >
            <Text tone="primary" className="font-bold text-xl leading-6">
              +
            </Text>
          </Pressable>
        </View>
        {slotLogs.length ? (
          <View className="mb-4 gap-2">
            {slotLogs.map((log) => (
              <FoodLogRow key={log.id} log={log} onDelete={() => remove.mutate(log.id)} />
            ))}
          </View>
        ) : (
          <View className="mb-4 rounded-2xl border border-dashed border-border bg-card">
            <EmptyState
              emoji={SLOT_EMOJI[slot]}
              title={t('meals.empty')}
              message={
                target === null
                  ? undefined
                  : t('meals.emptyTarget', { target: formatNumber(target) })
              }
              actionLabel={t('meals.addFood')}
              onAction={() => openLog(slot)}
            />
          </View>
        )}
        <FormMessage message={remove.isError ? t('meals.deleteFailed') : undefined} />
        <Text variant="caption" tone="muted" className="mt-2 text-center">
          {t('meals.planSoon')}
        </Text>
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
        <View className="flex-row items-center justify-between pb-3 pt-3">
          <Text variant="title" accessibilityRole="header" className="text-[22px]">
            {t('meals.title')}
          </Text>
          <View className="flex-row items-center gap-2">
            <Button
              label={t('meals.logFood')}
              size="md"
              fullWidth={false}
              onPress={() => openLog(slot)}
            />
            <NotificationBell />
          </View>
        </View>
        <DayNav day={day} now={now} onChange={setDay} />
        {body()}
      </ScrollView>
    </SafeAreaView>
  );
}
