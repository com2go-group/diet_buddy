import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Callout, Card, ErrorState, GradientFill, SkeletonCard, Text } from '@/components';
import { t } from '@/i18n';
import { formatWeight } from '@/lib/format';
import { haptics } from '@/lib/haptics';

import { profileQueryKey } from '../account/useProfile';
import { RewardGate, useShowAds } from '../ads';
import { FormMessage } from '../auth/components/FormMessage';
import { useSessionStore } from '../auth/sessionStore';
import { PlanWarnings } from '../onboarding/steps/PlanWarnings';
import { completeOnboarding, loadInitialPlan, type InitialPlanData } from './api';
import { buildInitialPlan } from './buildPlan';
import { ExerciseCard } from './components/ExerciseCard';
import { ForecastCard } from './components/ForecastCard';
import { HydrationCard } from './components/HydrationCard';
import { NutritionCard } from './components/NutritionCard';

export function InitialPlanScreen() {
  const userId = useSessionStore((s) => s.session?.user.id);
  const data = useQuery({
    queryKey: ['initial-plan', userId],
    enabled: Boolean(userId),
    queryFn: () => loadInitialPlan(userId!),
    gcTime: 0,
  });
  // Free users get an optional rewarded video before the plan (§6); skipping still shows it.
  const ads = useShowAds();
  const [revealed, setRevealed] = useState(false);
  if (data.isPending) {
    return (
      <SafeAreaView className="flex-1 gap-4 bg-background px-5 pt-16">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={5} />
        <SkeletonCard lines={3} />
      </SafeAreaView>
    );
  }
  if (data.isError) {
    return (
      <SafeAreaView className="flex-1 justify-center bg-background px-5">
        <ErrorState message={t('initialPlan.loadFailed')} onRetry={() => data.refetch()} />
      </SafeAreaView>
    );
  }
  if (ads.enabled && !revealed) {
    return (
      <RewardGate
        title={t('ads.planTitle')}
        description={t('ads.planDesc')}
        xp={100}
        type="ai_plan"
        target="initial"
        onDone={() => setRevealed(true)}
      />
    );
  }
  return <PlanView userId={userId!} data={data.data} />;
}

function PlanView({ userId, data }: { userId: string; data: InitialPlanData }) {
  const queryClient = useQueryClient();
  const { draft } = data.state;
  const built = buildInitialPlan(draft, data.metric);
  const weight = (kg: number, decimals?: number) => formatWeight(kg, draft.units, decimals);

  const finish = useMutation({
    mutationFn: () => completeOnboarding(userId, built!),
    onSuccess: async () => {
      haptics.success();
      await queryClient.invalidateQueries({ queryKey: profileQueryKey(userId) });
      router.replace('/home');
    },
  });

  if (!built) {
    // Answers are missing (shouldn't happen after onboarding): send the user back to finish them.
    return (
      <SafeAreaView className="flex-1 justify-center bg-background px-5">
        <ErrorState
          message={t('initialPlan.loadFailed')}
          onRetry={() => router.replace('/onboarding')}
        />
      </SafeAreaView>
    );
  }
  const goals = draft.goals.map((g) => t(`onboardingOptions.${g}`)).join(', ');
  const activity = draft.activity ? t(`onboardingOptions.${draft.activity}`) : '';

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <ScrollView contentContainerClassName="pb-10">
        <SafeAreaView edges={['top']} style={{ backgroundColor: '#1A1A2E' }}>
          <View className="items-center px-5 pb-7 pt-6">
            <Animated.View entering={FadeInDown.springify()}>
              <View className="mb-4 h-16 w-16 items-center justify-center overflow-hidden rounded-2xl">
                <GradientFill id="plan-hero" />
                <Text className="text-3xl leading-10">⚡</Text>
              </View>
            </Animated.View>
            <Text
              variant="title"
              accessibilityRole="header"
              className="text-center font-extrabold"
              style={{ color: '#F1F5F9' }}
            >
              {t('initialPlan.title')}
            </Text>
            <Text className="mt-1.5 text-center text-sm leading-6" style={{ color: '#94A3B8' }}>
              {t('initialPlan.personalizedFor', { name: draft.name.trim(), goals, activity })}
            </Text>
          </View>
        </SafeAreaView>

        <View className="gap-4 px-5 pt-5">
          <NutritionCard plan={built.plan} />
          <PlanWarnings plan={built.plan} formatWeight={weight} />
          <HydrationCard waterMl={built.plan.waterMl} />
          <ExerciseCard sessions={built.exercise} />
          {built.milestones.length > 0 ? (
            <ForecastCard curve={built.curve} milestones={built.milestones} formatWeight={weight} />
          ) : (
            <Card>
              <Text variant="label" className="mb-1 font-extrabold">
                {t('initialPlan.noForecastTitle')}
              </Text>
              <Text tone="muted" className="text-sm">
                {t('initialPlan.noForecast', { goals: goals.toLowerCase() })}
              </Text>
            </Card>
          )}
          <Callout emoji="ℹ️" tone="info">
            {t('common.notMedicalAdvice')}
          </Callout>
          <FormMessage message={finish.isError ? t('initialPlan.saveFailed') : undefined} />
          <Button
            label={t('initialPlan.start')}
            loading={finish.isPending}
            onPress={() => finish.mutate()}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
