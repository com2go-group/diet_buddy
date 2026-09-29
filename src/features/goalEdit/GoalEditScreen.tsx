import { Feather } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, ErrorState, SelectCard, SkeletonCard, Text } from '@/components';
import { t } from '@/i18n';
import { formatDuration, formatLongDate, formatNumber, formatWeight } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { FormMessage } from '../auth/components/FormMessage';
import { useSessionStore } from '../auth/sessionStore';
import type { OnboardingDraft } from '../onboarding/draft';
import { GoalWeightStep } from '../onboarding/steps/GoalWeightStep';
import { PaceStep } from '../onboarding/steps/PaceStep';
import { PlanWarnings } from '../onboarding/steps/PlanWarnings';
import { loadInitialPlan, type InitialPlanData } from '../plan/api';
import { saveGoalEdit } from './api';
import { editDraft, goalErrors, isLosing, previewPlan, withLosing } from './goalEdit';

const close = () => (router.canGoBack() ? router.back() : router.replace('/profile'));

/** Profile → Weight goal: change the goal weight and pace, or turn weight loss on or off. */
export function GoalEditScreen() {
  const userId = useSessionStore((s) => s.session?.user.id);
  const query = useQuery({
    queryKey: ['goalEdit', userId],
    enabled: Boolean(userId),
    queryFn: () => loadInitialPlan(userId!),
    gcTime: 0,
  });
  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <Header />
      {query.isPending ? (
        <View className="gap-4 px-5">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={4} />
        </View>
      ) : query.isError || !query.data ? (
        <View className="px-5">
          <ErrorState message={t('goalEdit.loadFailed')} onRetry={() => query.refetch()} />
        </View>
      ) : (
        <Editor userId={userId!} data={query.data} />
      )}
    </SafeAreaView>
  );
}

function Header() {
  const { colors } = useTheme();
  return (
    <View className="flex-row items-center justify-between px-5 pb-3 pt-2">
      <Text variant="heading" accessibilityRole="header" className="font-extrabold text-xl">
        {t('goalEdit.title')}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
        onPress={close}
        style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
        className="items-center justify-center rounded-full bg-muted active:opacity-70"
      >
        <Feather name="x" size={18} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

function Editor({ userId, data }: { userId: string; data: InitialPlanData }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<OnboardingDraft>(() =>
    editDraft(data.state.draft, data.metric),
  );
  const [showErrors, setShowErrors] = useState(false);
  const weight = (kg: number, decimals?: number) => formatWeight(kg, draft.units, decimals);
  const update = (patch: Partial<OnboardingDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const losing = isLosing(draft);
  const errors = showErrors ? goalErrors(draft, weight) : {};
  const built = previewPlan(draft, data.metric, weight);

  const save = useMutation({
    mutationFn: () => saveGoalEdit(userId, data.state.goalId, draft, built!),
    onSuccess: async () => {
      haptics.success();
      await Promise.all(
        ['profileOverview', 'home', 'meals', 'progress', 'planExplainer'].map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] }),
        ),
      );
      close();
    },
  });

  const onSave = () => {
    setShowErrors(true);
    if (!built) {
      haptics.warning();
      return;
    }
    save.mutate();
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerClassName="gap-4 px-5 pb-6" keyboardShouldPersistTaps="handled">
        {draft.weightKg ? (
          <Text tone="muted" className="text-[14px]">
            {t('goalEdit.current', { weight: weight(draft.weightKg, 1) })}
          </Text>
        ) : null}
        <View accessibilityRole="radiogroup" className="gap-2">
          <SelectCard
            emoji="🔥"
            title={t('goalEdit.lose')}
            description={t('goalEdit.loseDesc')}
            selectionRole="radio"
            selected={losing}
            onPress={() => setDraft((d) => withLosing(d, true))}
          />
          <SelectCard
            emoji="⚖️"
            title={t('goalEdit.noLoss')}
            description={t('goalEdit.noLossDesc')}
            selectionRole="radio"
            selected={!losing}
            onPress={() => setDraft((d) => withLosing(d, false))}
          />
        </View>
        {losing ? (
          <>
            <GoalWeightStep draft={draft} update={update} errors={errors} formatWeight={weight} />
            {draft.goalWeightKg && draft.weightKg && draft.goalWeightKg < draft.weightKg ? (
              <PaceStep draft={draft} update={update} errors={errors} formatWeight={weight} />
            ) : null}
          </>
        ) : null}
        {built ? (
          <Card className="gap-1">
            <Text variant="label" className="font-bold">
              {t('goalEdit.newPlan')}
            </Text>
            <Text className="text-[14px]">
              {t('goalEdit.calories', { kcal: formatNumber(built.plan.dailyCalories) })}
            </Text>
            {built.plan.timeline ? (
              <Text className="text-[14px]">
                {t('goalEdit.eta', {
                  date: formatLongDate(built.plan.timeline.goalDate),
                  duration: formatDuration(built.plan.timeline.weeks),
                })}
              </Text>
            ) : null}
            <Text variant="caption" tone="muted">
              {t('goalEdit.replaces')}
            </Text>
            <PlanWarnings plan={built.plan} formatWeight={weight} className="mt-2" />
          </Card>
        ) : null}
      </ScrollView>
      <View className="gap-1 border-t border-border px-5 pb-3 pt-3">
        <FormMessage message={save.isError ? t('goalEdit.saveFailed') : undefined} />
        <Button label={t('goalEdit.save')} loading={save.isPending} onPress={onSave} />
      </View>
    </KeyboardAvoidingView>
  );
}
