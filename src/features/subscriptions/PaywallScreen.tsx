import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, EmptyState, ErrorState, GradientFill, SkeletonCard, Text } from '@/components';
import { t } from '@/i18n';
import type { PlanOption } from '@/lib/purchases';
import { ACCENTS, MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { FormMessage } from '../auth/components/FormMessage';
import { authConfig } from '../auth/config';
import { PlanCard } from './components/PlanCard';
import { usePaywall } from './usePaywall';
import { usePremium } from './usePremium';

const close = () => (router.canGoBack() ? router.back() : router.replace('/home'));
const store = () => (Platform.OS === 'ios' ? t('paywall.appStore') : t('paywall.googlePlay'));
const MANAGE_URL = Platform.select({
  ios: 'https://apps.apple.com/account/subscriptions',
  default: 'https://play.google.com/store/account/subscriptions',
});

const NOW = ['featureNoAds', 'featureCoach', 'featureMealPlans', 'featureSupport'] as const;
const SOON = [
  'soonBodyScan',
  'soonRestaurant',
  'soonGrocery',
  'soonPhotos',
  'soonTwin',
  'soonStory',
] as const;

/** Store-required terms under the button (CLAUDE.md §12: trial terms and renewal price). */
export function termsFor(plan: PlanOption): string {
  if (plan.kind === 'lifetime') return t('paywall.termsLifetime', { price: plan.price });
  const period = plan.kind === 'annual' ? t('paywall.year') : t('paywall.month');
  return plan.trialDays !== null
    ? t('paywall.termsTrial', { days: plan.trialDays, price: plan.price, period, store: store() })
    : t('paywall.termsSubscription', { price: plan.price, period, store: store() });
}

function ctaFor(plan: PlanOption): string {
  if (plan.trialDays !== null) return t('paywall.ctaTrial', { days: plan.trialDays });
  return t(
    plan.kind === 'annual'
      ? 'paywall.ctaAnnual'
      : plan.kind === 'lifetime'
        ? 'paywall.ctaLifetime'
        : 'paywall.ctaMonthly',
  );
}

/** Paywall (CLAUDE.md §12, prototype SubscriptionsScreen). Prices come from the store. */
export function PaywallScreen() {
  const { colors } = useTheme();
  const { premium } = usePremium();
  const { available, plans, buy, restore, cancelled } = usePaywall();
  const [selected, setSelected] = useState<string | null>(null);
  const list = plans.data ?? [];
  const plan =
    list.find((p) => p.id === selected) ?? list.find((p) => p.kind === 'annual') ?? list[0];

  const body = () => {
    if (premium) {
      return (
        <View className="gap-4">
          <EmptyState
            emoji="👑"
            title={t('paywall.activeTitle')}
            message={t('paywall.activeDesc')}
          />
          <Button
            label={t('paywall.manage')}
            variant="outline"
            onPress={() => Linking.openURL(MANAGE_URL)}
          />
        </View>
      );
    }
    if (!available)
      return (
        <EmptyState emoji="📱" title={t('paywall.title')} message={t('paywall.unavailable')} />
      );
    if (plans.isPending) return <SkeletonCard lines={4} />;
    if (plans.isError)
      return <ErrorState message={t('paywall.loadFailed')} onRetry={() => plans.refetch()} />;
    if (!plan) return <EmptyState emoji="🛒" title={t('paywall.noPlans')} />;
    return (
      <View className="gap-3">
        <Text variant="heading" accessibilityRole="header" className="text-base">
          {t('paywall.choose')}
        </Text>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={t('paywall.choose')}
          className="gap-2.5"
        >
          {list.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              selected={p.id === plan.id}
              onPress={() => setSelected(p.id)}
            />
          ))}
        </View>
        <FormMessage
          message={buy.isError && !cancelled ? t('paywall.purchaseFailed') : undefined}
        />
        <Button
          label={ctaFor(plan)}
          size="lg"
          loading={buy.isPending}
          onPress={() => buy.mutate(plan.id)}
        />
        <Text variant="caption" tone="muted" className="text-center leading-4">
          {termsFor(plan)}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <ScrollView contentContainerClassName="pb-8">
        <View className="items-center px-5 pb-6 pt-4" style={{ backgroundColor: '#1A1A2E' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('paywall.close')}
            onPress={close}
            style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
            className="items-center justify-center self-end rounded-full active:opacity-70"
          >
            <Feather name="x" size={20} color="#F1F5F9" />
          </Pressable>
          <View className="mb-3 h-16 w-16 items-center justify-center overflow-hidden rounded-2xl">
            <GradientFill id="paywallCrown" />
            <Text className="text-3xl leading-10">👑</Text>
          </View>
          <Text
            accessibilityRole="header"
            className="font-extrabold text-2xl"
            style={{ color: '#F1F5F9' }}
          >
            {t('paywall.title')}
          </Text>
          <Text className="mt-1 text-center text-[14px]" style={{ color: '#94A3B8' }}>
            {t('paywall.subtitle')}
          </Text>
        </View>
        <View className="gap-6 px-5 pt-5">
          {body()}
          <View className="gap-2">
            <Text variant="label" className="font-bold">
              {t('paywall.includedNow')}
            </Text>
            {NOW.map((key) => (
              <View key={key} className="flex-row items-center gap-2">
                <Feather name="check-circle" size={16} color={ACCENTS.green.light} />
                <Text className="text-[14px]">{t(`paywall.${key}`)}</Text>
              </View>
            ))}
            <Text variant="label" tone="muted" className="mt-3 font-bold">
              {t('paywall.comingSoon')}
            </Text>
            {SOON.map((key) => (
              <View key={key} className="flex-row items-center gap-2">
                <Feather name="clock" size={15} color={colors.mutedForeground} />
                <Text tone="muted" className="text-[14px]">
                  {t(`paywall.${key}`)}
                </Text>
              </View>
            ))}
          </View>
          {available && !premium ? (
            <View className="gap-2">
              <FormMessage
                tone={restore.data ? 'info' : 'error'}
                message={
                  restore.isError
                    ? t('paywall.restoreFailed')
                    : restore.isSuccess
                      ? restore.data
                        ? t('paywall.restored')
                        : t('paywall.nothingToRestore')
                      : undefined
                }
              />
              <Button
                label={t('paywall.restore')}
                variant="ghost"
                loading={restore.isPending}
                onPress={() => restore.mutate()}
              />
            </View>
          ) : null}
          <View className="flex-row justify-center gap-6">
            {authConfig.termsUrl ? (
              <Text
                tone="primary"
                variant="caption"
                accessibilityRole="link"
                onPress={() => Linking.openURL(authConfig.termsUrl!)}
              >
                {t('paywall.terms')}
              </Text>
            ) : null}
            {authConfig.privacyUrl ? (
              <Text
                tone="primary"
                variant="caption"
                accessibilityRole="link"
                onPress={() => Linking.openURL(authConfig.privacyUrl!)}
              >
                {t('paywall.privacy')}
              </Text>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
