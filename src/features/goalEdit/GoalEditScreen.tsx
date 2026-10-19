import { Feather } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ErrorState, SkeletonCard, Text } from '@/components';
import { t } from '@/i18n';
import { formatWeight } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { FormMessage } from '../auth/components/FormMessage';
import { useSessionStore } from '../auth/sessionStore';
import type { OnboardingDraft } from '../onboarding/draft';
import { GoalWeightStep } from '../onboarding/steps/GoalWeightStep';
import { PaceStep } from '../onboarding/steps/PaceStep';
import { loadGoalEdit, saveGoalEdit, type GoalEditData } from './api';
import {
  ActivitySection,
  GoalsSection,
  PlanPreview,
  TrainingSection,
} from './components/GoalEditSections';
import { editDraft, editMetric, goalErrors, isLosing, previewPlan } from './goalEdit';

const close = () => (router.canGoBack() ? router.back() : router.replace('/profile'));

/** Profile → Goals & activity: goals, goal weight and pace, activity level and training days. */
export function GoalEditScreen() {
  const userId = useSessionStore((s) => s.session?.user.id);
  const query = useQuery({
    queryKey: ['goalEdit', userId],
    enabled: Boolean(userId),
    queryFn: () => loadGoalEdit(userId!),
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

function Editor({ userId, data }: { userId: string; data: GoalEditData }) {
  const queryClient = useQueryClient();
  const saved = data.state.draft;
  const [draft, setDraft] = useState<OnboardingDraft>(() => editDraft(saved, data.metric));
  const [showErrors, setShowErrors] = useState(false);
  const weight = (kg: number, decimals?: number) => formatWeight(kg, draft.units, decimals);
  const update = (patch: Partial<OnboardingDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const losing = isLosing(draft);
  const errors = showErrors ? goalErrors(draft, weight) : {};
  const built = previewPlan(draft, editMetric(data.metric, draft, saved.activity), weight);

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
        <GoalsSection draft={draft} update={update} errors={errors} />
        {losing ? (
          <>
            <GoalWeightStep draft={draft} update={update} errors={errors} formatWeight={weight} />
            {draft.goalWeightKg && draft.weightKg && draft.goalWeightKg < draft.weightKg ? (
              <PaceStep draft={draft} update={update} errors={errors} formatWeight={weight} />
            ) : null}
          </>
        ) : null}
        <ActivitySection draft={draft} update={update} />
        <TrainingSection draft={draft} update={update} />
        {built ? (
          <PlanPreview built={built} currentKcal={data.currentKcal} formatWeight={weight} />
        ) : null}
      </ScrollView>
      <View className="gap-1 border-t border-border px-5 pb-3 pt-3">
        <FormMessage message={save.isError ? t('goalEdit.saveFailed') : undefined} />
        <Button label={t('goalEdit.save')} loading={save.isPending} onPress={onSave} />
      </View>
    </KeyboardAvoidingView>
  );
}
