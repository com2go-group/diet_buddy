import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, EmptyState, ErrorState, ProgressBar, SkeletonCard, Text } from '@/components';
import { t } from '@/i18n';
import { formatWeight } from '@/lib/format';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { FormMessage } from '../auth/components/FormMessage';
import { CheckInDone } from './components/CheckInDone';
import { CheckInQuestion } from './components/CheckInQuestions';
import {
  CHECKIN_STEPS,
  initialAnswers,
  isValidWeight,
  WEIGHT_MAX_KG,
  WEIGHT_MIN_KG,
  type CheckInAnswers,
} from './logic';
import { useCheckIn } from './useCheckIn';

const close = () => (router.canGoBack() ? router.back() : router.replace('/home'));

/** Daily check-in (CLAUDE.md §7.9): five short questions, then a summary with the XP earned. */
export function CheckInScreen() {
  const { colors } = useTheme();
  const { context, save, alreadyCheckedIn } = useCheckIn();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<CheckInAnswers | null>(null);
  const [weightError, setWeightError] = useState<string>();

  if (context.data && answers === null) setAnswers(initialAnswers(context.data.latestWeightKg));

  const shell = (children: ReactNode) => (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      {children}
    </SafeAreaView>
  );

  if (context.isPending || (context.data && !answers)) {
    return shell(
      <View className="gap-3 p-5">
        <SkeletonCard lines={1} />
        <SkeletonCard lines={3} />
      </View>,
    );
  }
  if (context.isError || !answers) {
    return shell(<ErrorState onRetry={() => context.refetch()} />);
  }
  const { units } = context.data;
  if (save.isSuccess) return shell(<CheckInDone answers={answers} units={units} onClose={close} />);
  if (context.data.alreadyCheckedIn || alreadyCheckedIn) {
    return shell(
      <View className="flex-1 justify-center px-5">
        <EmptyState
          emoji="✅"
          title={t('checkIn.already')}
          message={t('checkIn.alreadyDesc')}
          actionLabel={t('checkIn.backHome')}
          onAction={close}
        />
      </View>,
    );
  }

  const current = CHECKIN_STEPS[step]!;
  const last = step === CHECKIN_STEPS.length - 1;
  const next = () => {
    if (!last) return setStep(step + 1);
    if (!isValidWeight(answers.weightKg)) {
      setWeightError(
        t('checkIn.weightInvalid', {
          min: formatWeight(WEIGHT_MIN_KG, units, 0),
          max: formatWeight(WEIGHT_MAX_KG, units, 0),
        }),
      );
      return;
    }
    save.mutate(answers);
  };

  return shell(
    <>
      <View className="flex-row items-center justify-between px-5 pb-4 pt-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={step > 0 ? t('checkIn.back') : t('checkIn.close')}
          onPress={step > 0 ? () => setStep(step - 1) : close}
          style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
          className="items-center justify-center rounded-full bg-muted active:opacity-70"
        >
          <Feather
            name={step > 0 ? 'chevron-left' : 'x'}
            size={18}
            color={colors.mutedForeground}
          />
        </Pressable>
        <Text variant="heading" accessibilityRole="header" className="font-bold text-base">
          {t('checkIn.title')}
        </Text>
        <Text variant="label" tone="muted" className="w-11 text-right">
          {t('checkIn.step', { current: step + 1, total: CHECKIN_STEPS.length })}
        </Text>
      </View>
      <View className="mb-6 px-5">
        <ProgressBar
          value={(step + 1) / CHECKIN_STEPS.length}
          label={t('checkIn.step', { current: step + 1, total: CHECKIN_STEPS.length })}
        />
      </View>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-6"
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="title" className="mb-6 text-[22px]">
          {t(`checkIn.${current}`)}
        </Text>
        <CheckInQuestion
          step={current}
          answers={answers}
          units={units}
          weightError={weightError}
          onChange={(patch) => {
            setWeightError(undefined);
            setAnswers({ ...answers, ...patch });
          }}
        />
      </ScrollView>
      <View className="gap-2 px-5 pb-4 pt-2">
        <FormMessage
          message={save.isError && !alreadyCheckedIn ? t('checkIn.saveFailed') : undefined}
        />
        <Button
          label={last ? t('checkIn.finish') : t('checkIn.next')}
          size="lg"
          loading={save.isPending}
          onPress={next}
        />
        {last && answers.weightKg !== null ? (
          <Button
            variant="ghost"
            label={t('checkIn.skipWeight')}
            disabled={save.isPending}
            onPress={() => {
              const skipped = { ...answers, weightKg: null };
              setAnswers(skipped);
              save.mutate(skipped);
            }}
          />
        ) : null}
      </View>
    </>,
  );
}
