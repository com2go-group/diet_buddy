import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, EmptyState, ErrorState, GradientFill, SkeletonCard, Text } from '@/components';
import { t, type StringKey } from '@/i18n';
import type { PlanOption } from '@/lib/purchases';
import { storeErrorCode } from '@/lib/purchases/plans';
import { ACCENTS, MIN_TOUCH_TARGET } from '@/theme';
import { track } from '@/lib/telemetry';

import { FormMessage } from '../auth/components/FormMessage';
import { openLegal } from '../legal/legal';
import { PlanCard } from './components/PlanCard';
import { isPaywallFeature, orderedFeatures, type PaywallFeature } from './paywallRoute';
import { usePaywall } from './usePaywall';
import { usePremium } from './usePremium';

const close = () => (router.canGoBack() ? router.back() : router.replace('/home'));
const store = () => (Platform.OS === 'ios' ? t('paywall.appStore') : t('paywall.googlePlay'));
const MANAGE_URL = Platform.select({
  ios: 'https://apps.apple.com/account/subscriptions',
  default: 'https://play.google.com/store/account/subscriptions',
});

const FEATURE_LABEL: Record<PaywallFeature, StringKey> = {
  noAds: 'paywall.featureNoAds',
  coach: 'paywall.featureCoach',
  mealPlans: 'paywall.featureMealPlans',
  photos: 'paywall.featurePhotos',
  insights: 'paywall.featureInsights',
  wellness: 'paywall.featureWellness',
  grocery: 'paywall.featureGrocery',
  restaurant: 'paywall.featureRestaurant',
  foodPhotos: 'paywall.featureFoodPhotos',
  bodyScan: 'paywall.featureBodyScan',
  twin: 'paywall.featureTwin',
  story: 'paywall.featureStory',
  support: 'paywall.featureSupport',
};
const featureKey = (f: PaywallFeature) => FEATURE_LABEL[f];
/** Store-required terms under the button (CLAUDE.md §12: trial terms and renewal price). */
export function termsFor(plan: PlanOption): string {
  const period = plan.kind === 'annual' ? t('paywall.year') : t('paywall.month');
  return plan.trialDays !== null
    ? t('paywall.termsTrial', { days: plan.trialDays, price: plan.price, period, store: store() })
    : t('paywall.termsSubscription', { price: plan.price, period, store: store() });
}

function ctaFor(plan: PlanOption): string {
  if (plan.trialDays !== null) return t('paywall.ctaTrial', { days: plan.trialDays });
  return t(plan.kind === 'annual' ? 'paywall.ctaAnnual' : 'paywall.ctaMonthly');
}

/**
 * Paywall (CLAUDE.md §12, prototype SubscriptionsScreen). Prices come from the store. Opened from a
 * Premium gate it leads with that feature; `welcome` is the one-time trial offer after onboarding,
 * which can always be closed with "Continue free".
 */
export function PaywallScreen() {
  const params = useLocalSearchParams<{ feature?: string; welcome?: string }>();
  const featured = isPaywallFeature(params.feature) ? params.feature : null;
  const welcome = params.welcome === '1';
  const { premium } = usePremium();
  const { available, plans, buy, restore, cancelled } = usePaywall();
  useEffect(() => {
    track('paywall_viewed', { feature: featured, welcome });
  }, [featured, welcome]);
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
        <EmptyState
          emoji="📱"
          title={t('paywall.title')}
          message={t(Platform.OS === 'web' ? 'paywall.unavailable' : 'paywall.unavailableBuild')}
        />
      );
    if (plans.isPending) return <SkeletonCard lines={4} />;
    if (plans.isError) {
      const code = storeErrorCode(plans.error);
      const message = t('paywall.loadFailed');
      return (
        <ErrorState
          message={code ? `${message}\n${t('paywall.errorCode', { code })}` : message}
          onRetry={() => plans.refetch()}
        />
      );
    }
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
            {welcome ? t('paywall.welcomeTitle') : t('paywall.title')}
          </Text>
          <Text className="mt-1 text-center text-[14px]" style={{ color: '#94A3B8' }}>
            {welcome ? t('paywall.welcomeSubtitle') : t('paywall.subtitle')}
          </Text>
          {featured ? (
            <View className="mt-3 rounded-full bg-primary/20 px-3 py-1.5">
              {/* Always on the dark header, so the light amber reads at AA. */}
              <Text variant="caption" className="font-bold" style={{ color: '#FCD34D' }}>
                {t('paywall.unlocks', { feature: t(featureKey(featured)) })}
              </Text>
            </View>
          ) : null}
        </View>
        <View className="gap-6 px-5 pt-5">
          {body()}
          <View className="gap-2">
            <Text variant="label" className="font-bold">
              {t('paywall.includedNow')}
            </Text>
            {orderedFeatures(featured).map((key) => (
              <View
                key={key}
                className={
                  key === featured
                    ? 'flex-row items-center gap-2 rounded-xl bg-primary/10 px-2 py-1.5'
                    : 'flex-row items-center gap-2'
                }
              >
                <Feather name="check-circle" size={16} color={ACCENTS.green.light} />
                <Text className={key === featured ? 'font-bold text-[14px]' : 'text-[14px]'}>
                  {t(featureKey(key))}
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
          {welcome && !premium ? (
            <Button label={t('paywall.continueFree')} variant="outline" onPress={close} />
          ) : null}
          <View className="flex-row justify-center gap-6">
            <Text
              tone="primary"
              variant="caption"
              accessibilityRole="link"
              onPress={() => openLegal('terms')}
            >
              {t('paywall.terms')}
            </Text>
            <Text
              tone="primary"
              variant="caption"
              accessibilityRole="link"
              onPress={() => openLegal('privacy')}
            >
              {t('paywall.privacy')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
