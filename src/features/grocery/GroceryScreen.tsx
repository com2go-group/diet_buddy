import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Callout, ErrorState, SkeletonCard, Text } from '@/components';
import { t } from '@/i18n';
import { formatMoney } from '@/lib/format';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { MealPlanError } from '../meals/mealPlanApi';
import { useProfile } from '../account/useProfile';
import { usePremium } from '../subscriptions/usePremium';
import { GroceryError } from './api';
import { dayName, WeekPlan } from './components/WeekPlan';
import { ShoppingList } from './components/ShoppingList';
import { useGrocery, WEEK } from './useGrocery';

const close = () => (router.canGoBack() ? router.back() : router.replace('/home'));

function errorText(error: unknown): string {
  const code =
    error instanceof GroceryError || error instanceof MealPlanError ? error.code : 'failed';
  if (code === 'not_configured') return t('grocery.notConfigured');
  if (code === 'rate_limited' || code === 'regenerate_limit') return t('grocery.rateLimited');
  if (code === 'premium_required') return t('grocery.premiumPending');
  return t('grocery.failed');
}

/** Grocery AI (Premium): plan the next 7 days, then one shopping list sorted by aisle. */
export function GroceryScreen() {
  const { colors } = useTheme();
  const { premium, loading } = usePremium();
  const [now] = useState(() => new Date());
  const { dates, list, plans, build, planning, toggle } = useGrocery(now, premium);
  const profile = useProfile();
  const units = profile.data?.units ?? 'metric';

  const header = (
    <View className="flex-row items-center justify-between px-5 pb-3 pt-3">
      <View style={{ width: MIN_TOUCH_TARGET }} />
      <Text variant="heading" accessibilityRole="header">
        🛒 {t('grocery.title')}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('grocery.close')}
        onPress={close}
        style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
        className="items-center justify-center rounded-full bg-muted active:opacity-70"
      >
        <Feather name="x" size={18} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );

  const body = () => {
    if (loading) return <SkeletonCard lines={4} />;
    if (!premium) {
      return (
        <View className="gap-4">
          <Callout emoji="⭐">{t('grocery.locked')}</Callout>
          <Button label={t('grocery.upgrade')} onPress={() => router.push('/paywall')} />
        </View>
      );
    }
    if (list.isPending || plans.isPending) return <SkeletonCard lines={6} />;
    if (list.isError || plans.isError) {
      return (
        <ErrorState
          message={t('grocery.loadFailed')}
          onRetry={() => (list.refetch(), plans.refetch())}
        />
      );
    }
    const current = list.data;
    const progress =
      planning === 'list'
        ? t('grocery.buildingList')
        : planning
          ? t('grocery.planningDay', { day: dayName(planning.date), index: planning.index + 1 })
          : null;
    return (
      <View className="gap-5">
        <Text tone="muted">{t('grocery.intro')}</Text>
        <View className="gap-2">
          <Text variant="heading" accessibilityRole="header" className="text-base">
            {t('grocery.weekTitle')}
          </Text>
          <WeekPlan dates={dates} plans={plans.data} />
        </View>
        {progress ? (
          <Text tone="muted" className="text-center" accessibilityLiveRegion="polite">
            {progress}
          </Text>
        ) : null}
        {build.isError ? (
          <Callout emoji="⚠️" tone="danger" live>
            {errorText(build.error)}
          </Callout>
        ) : null}
        <Button
          label={current ? t('grocery.rebuild') : t('grocery.build')}
          variant={current && plans.data.length === WEEK ? 'outline' : 'primary'}
          loading={build.isPending}
          onPress={() => build.mutate()}
        />
        {current ? (
          <View className="gap-3">
            <View className="flex-row items-end justify-between">
              <Text variant="heading" accessibilityRole="header" className="text-base">
                {t('grocery.listTitle')}
              </Text>
              <Text tone="muted" className="text-[13px]" accessibilityLiveRegion="polite">
                {t('grocery.progress', {
                  checked: current.checked.filter((id) => current.items.some((i) => i.id === id))
                    .length,
                  total: current.items.length,
                })}
              </Text>
            </View>
            <ShoppingList list={current} units={units} onToggle={(c) => toggle.mutate(c)} />
            {current.estimatedCost !== null ? (
              <Text className="text-center font-bold">
                {t('grocery.estimate', {
                  cost: formatMoney(current.estimatedCost, current.currency),
                })}
              </Text>
            ) : null}
            <Text variant="caption" tone="muted" className="text-center">
              {t('grocery.estimateNote')}
            </Text>
          </View>
        ) : (
          <View className="items-center gap-1 py-4">
            <Text className="text-3xl leading-10">🧺</Text>
            <Text variant="label" className="font-bold">
              {t('grocery.empty')}
            </Text>
            <Text tone="muted" className="text-center text-[13px]">
              {t('grocery.emptyDesc')}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      {header}
      <ScrollView contentContainerClassName="px-5 pb-10">{body()}</ScrollView>
    </SafeAreaView>
  );
}
