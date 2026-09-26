import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Callout, ErrorState, SkeletonCard, Text } from '@/components';
import { t } from '@/i18n';
import { bmiCategory } from '@/lib/nutrition';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { FormMessage } from '../auth/components/FormMessage';
import type { OnboardingState } from '../onboarding/api';
import { useSavedOnboarding } from '../onboarding/useOnboarding';
import { usePremium } from '../subscriptions/usePremium';
import { AiScanPanel } from './components/AiScanPanel';
import { CompositionCard } from './components/CompositionCard';
import { ManualForm } from './components/ManualForm';
import { ModeChooser } from './components/ModeChooser';
import { StatCard } from './components/StatCard';
import type { MetricKey, ScanResults } from './results';
import { useBodyScan, type ScanContext } from './useBodyScan';

export function BodyScanScreen() {
  const saved = useSavedOnboarding();
  if (saved.isPending || saved.isRefetching) {
    return (
      <SafeAreaView className="flex-1 gap-4 bg-background px-5 pt-16">
        <SkeletonCard lines={3} />
        <SkeletonCard lines={3} />
      </SafeAreaView>
    );
  }
  if (saved.isError) {
    return (
      <SafeAreaView className="flex-1 justify-center bg-background px-5">
        <ErrorState onRetry={() => saved.refetch()} />
      </SafeAreaView>
    );
  }
  return <BodyScan initial={saved.data} />;
}

function subLabel(key: MetricKey, r: ScanResults): string {
  if (r.overridden[key]) return t('bodyScan.edited');
  switch (key) {
    case 'bodyFat':
      return t('bodyScan.estimated');
    case 'bmr':
      return t('bodyScan.metabolicRate');
    case 'tdee':
      return t('bodyScan.withActivity');
    case 'bmi':
      return t(`measurements.${bmiCategory(r.values.bmi)}`);
    default:
      return t('bodyScan.calculated');
  }
}

const ROWS: MetricKey[][] = [
  ['bodyFat', 'leanMass'],
  ['fatMass', 'bmr'],
  ['tdee', 'bmi'],
];

export function BodyScan({
  initial,
  context = 'onboarding',
  onSaved,
  onExit,
}: {
  initial: OnboardingState;
  context?: ScanContext;
  onSaved?: () => void;
  /** Where "back" goes from the first step (onboarding goes back to the questions). */
  onExit?: () => void;
}) {
  const c = useBodyScan(initial, context, onSaved);
  const { premium } = usePremium();
  const { colors } = useTheme();
  const back = () => {
    if (c.mode === 'results') c.setMode(c.ai ? 'ai' : 'manual');
    else if (c.mode === 'manual' || c.mode === 'ai') c.setMode('choose');
    else if (onExit) onExit();
    else router.replace('/onboarding');
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-row items-center gap-3 px-5 pb-3 pt-2">
        <Pressable
          onPress={back}
          accessibilityRole="button"
          accessibilityLabel={t('auth.back')}
          style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
          className="items-center justify-center rounded-full bg-muted active:opacity-70"
        >
          <Feather name="chevron-left" size={20} color={colors.mutedForeground} />
        </Pressable>
        <Text
          variant="heading"
          accessibilityRole="header"
          className="flex-1 font-extrabold text-xl"
        >
          {context === 'check' ? t('bodyScan.checkTitle') : t('bodyScan.title')}
        </Text>
        {c.mode === 'results' ? (
          <Button
            variant="secondary"
            size="md"
            fullWidth={false}
            label={t('bodyScan.reset')}
            onPress={c.reset}
          />
        ) : null}
      </View>

      <ScrollView contentContainerClassName="px-5 pb-8" keyboardShouldPersistTaps="handled">
        <Animated.View key={c.mode} entering={FadeIn.duration(250)}>
          {c.mode === 'choose' ? (
            <ModeChooser
              premium={premium}
              onManual={() => c.setMode('manual')}
              onAi={() => c.setMode('ai')}
            />
          ) : null}
          {c.mode === 'ai' ? <AiScanPanel onMeasured={c.applyAi} /> : null}
          {c.mode === 'manual' ? (
            <ManualForm
              tape={c.tape}
              onChange={c.setTape}
              units={c.units}
              onSubmit={() => c.setMode('results')}
            />
          ) : null}
          {c.mode === 'results' && !c.results ? (
            // Answers needed for the calculation are missing; go back to finish them.
            <ErrorState onRetry={() => router.replace('/onboarding')} />
          ) : null}
          {c.mode === 'results' && c.results ? (
            <View className="gap-4">
              <Callout emoji="✅" tone="success">
                <Text variant="label" className="font-bold">
                  {t('bodyScan.resultsTitle')}
                </Text>
                <Text variant="caption" tone="muted" className="mt-0.5">
                  {t('bodyScan.resultsHint')}
                </Text>
              </Callout>
              <View className="gap-3">
                {ROWS.map((row) => (
                  <View key={row.join()} className="flex-row gap-3">
                    {row.map((key) => (
                      <StatCard
                        key={key}
                        metric={key}
                        value={c.results!.values[key]}
                        units={c.units}
                        subLabel={subLabel(key, c.results!)}
                        onEdit={(v) => c.edit(key, v)}
                      />
                    ))}
                  </View>
                ))}
              </View>
              <Text variant="caption" tone="muted">
                {c.ai && c.results.method === 'navy'
                  ? t('bodyScan.methodAi')
                  : t(
                      `bodyScan.method${c.results.method === 'navy' ? 'Navy' : c.results.method === 'user' ? 'User' : 'Bmi'}`,
                    )}
              </Text>
              {c.ai ? (
                <Callout emoji="📐" tone="info">
                  <Text className="text-[13px]">
                    {t('bodyScan.aiEstimateNote', {
                      confidence: t(`bodyScan.confidence_${c.ai.confidence}`),
                    })}
                  </Text>
                  <Text className="font-semibold text-[13px]">
                    {`${t('bodyScan.waist')}: ${c.ai.waistCm} cm · ${t('bodyScan.hips')}: ${c.ai.hipCm} cm · ${t('bodyScan.neck')}: ${c.ai.neckCm} cm`}
                  </Text>
                </Callout>
              ) : null}
              <CompositionCard
                bodyFatPct={c.results.values.bodyFat}
                caption={
                  c.ageYears
                    ? t('bodyScan.nameAge', { name: c.name.split(' ')[0] ?? '', age: c.ageYears })
                    : null
                }
              />
              <FormMessage message={c.saveFailed ? t('bodyScan.saveFailed') : undefined} />
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Button
                    variant="outline"
                    label={t('bodyScan.rescan')}
                    onPress={() => c.setMode(c.ai ? 'ai' : 'manual')}
                  />
                </View>
                <View className="flex-1">
                  <Button label={t('bodyScan.save')} loading={c.saving} onPress={c.save} />
                </View>
              </View>
            </View>
          ) : null}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
