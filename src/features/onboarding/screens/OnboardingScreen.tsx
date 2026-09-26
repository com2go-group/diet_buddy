import { Feather } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import Animated, { FadeIn, SlideInLeft, SlideInRight } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ErrorState, ProgressBar, SkeletonCard, Text } from '@/components';
import { AppBanner } from '@/features/ads';
import { t } from '@/i18n';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { signOut } from '../../auth/api';
import { FormMessage } from '../../auth/components/FormMessage';
import { SKIPPABLE_STEPS } from '../options';
import { STEP_COMPONENTS } from '../steps';
import type { OnboardingState } from '../api';
import { useOnboarding, useSavedOnboarding } from '../useOnboarding';

/** Loads saved progress, then shows the flow from where the user left off. */
export function OnboardingScreen() {
  const saved = useSavedOnboarding();
  if (saved.isPending || saved.isRefetching) {
    return (
      <SafeAreaView className="flex-1 gap-4 bg-background px-5 pt-16">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={4} />
      </SafeAreaView>
    );
  }
  if (saved.isError) {
    return (
      <SafeAreaView className="flex-1 justify-center bg-background px-5">
        <ErrorState message={t('onboarding.loadFailed')} onRetry={() => saved.refetch()} />
      </SafeAreaView>
    );
  }
  return <OnboardingFlow initial={saved.data} />;
}

function OnboardingFlow({ initial }: { initial: OnboardingState }) {
  const c = useOnboarding(initial);
  const { colors } = useTheme();
  const scroll = useRef<ScrollView>(null);

  // Android back goes to the previous step instead of leaving onboarding.
  const back = useRef(c.back);
  useEffect(() => {
    back.current = c.back;
  });
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => back.current());
    return () => sub.remove();
  }, []);

  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [c.step]);

  const Step = STEP_COMPONENTS[c.step];
  const needsGoal = c.step === 'goal' && c.draft.goals.length === 0;
  const early = c.index <= 1;
  const entering = (c.direction === 1 ? SlideInRight : SlideInLeft).duration(260);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="px-5 pb-3 pt-2">
          <View className="mb-3 flex-row items-center justify-between">
            {c.index > 0 ? (
              <Pressable
                onPress={c.back}
                accessibilityRole="button"
                accessibilityLabel={t('onboarding.back')}
                style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
                className="items-center justify-center rounded-full bg-muted active:opacity-70"
              >
                <Feather name="chevron-left" size={20} color={colors.mutedForeground} />
              </Pressable>
            ) : (
              <View style={{ width: MIN_TOUCH_TARGET }} />
            )}
            <Text variant="label" tone="muted" accessibilityElementsHidden>
              {t('onboarding.stepCounter', { current: c.index + 1, total: c.total })}
            </Text>
            {early ? (
              <Pressable
                onPress={() => signOut().catch(() => undefined)}
                accessibilityRole="button"
                style={{ minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET }}
                className="items-end justify-center"
              >
                <Text variant="caption" tone="muted" className="font-semibold">
                  {t('onboarding.signOut')}
                </Text>
              </Pressable>
            ) : (
              <View style={{ width: MIN_TOUCH_TARGET }} />
            )}
          </View>
          <ProgressBar
            value={c.index / Math.max(1, c.total - 1)}
            label={t('onboarding.progress', { current: c.index + 1, total: c.total })}
          />
        </View>

        <ScrollView
          ref={scroll}
          className="flex-1"
          contentContainerClassName="px-5 pb-6"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View key={c.step} entering={c.index === 0 ? FadeIn.duration(260) : entering}>
            <Step
              draft={c.draft}
              update={c.update}
              errors={c.errors}
              formatWeight={c.formatWeight}
            />
          </Animated.View>
        </ScrollView>

        <View className="gap-1 border-t border-border px-5 pb-4 pt-3">
          <FormMessage message={c.saveFailed ? t('onboarding.saveFailed') : undefined} />
          <Button
            label={
              needsGoal
                ? t('onboarding.selectGoal')
                : c.isLast
                  ? t('onboarding.startJourney')
                  : t('onboarding.continue')
            }
            disabled={needsGoal}
            loading={c.saving}
            onPress={() => c.next()}
            className={c.saveFailed ? 'mt-2' : undefined}
          />
          {SKIPPABLE_STEPS.includes(c.step) ? (
            <Button
              variant="ghost"
              size="md"
              label={t('onboarding.skip')}
              onPress={() => c.next({ skip: true })}
            />
          ) : null}
          <AppBanner />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
