import { View } from 'react-native';

import { SelectCard, Text } from '@/components';
import { t } from '@/i18n';
import { formatDuration } from '@/lib/format';
import { comparePaces, computePlan } from '@/lib/nutrition';

import { previewInputFrom } from '../draft';
import { PACES } from '../options';
import { PlanWarnings } from './PlanWarnings';
import { StepHeader, type StepProps } from './shared';

export function PaceStep({ draft, update, formatWeight }: StepProps) {
  const input = previewInputFrom(draft);
  const scenarios = input ? comparePaces(input) : [];
  const plan = input ? computePlan({ ...input, pace: draft.pace }) : null;
  const maxWeeks = Math.max(1, ...scenarios.map((s) => s.weeks ?? 0));
  const kgToLose = draft.weightKg && draft.goalWeightKg ? draft.weightKg - draft.goalWeightKg : 0;

  return (
    <>
      <StepHeader emoji="📈" title={t('pace.title')} subtitle={t('pace.subtitle')} />
      <View className="gap-3">
        {PACES.map((pace) => {
          const scenario = scenarios.find((s) => s.pace === pace.id);
          const deficit =
            plan && input ? Math.round(plan.tdee - (scenario?.dailyCalories ?? plan.tdee)) : 0;
          return (
            <SelectCard
              key={pace.id}
              emoji={pace.emoji}
              title={t(`onboardingOptions.${pace.id}`)}
              description={t(`onboardingOptions.${pace.id}Desc`)}
              trailing={t(`onboardingOptions.${pace.id}Rate`)}
              badge={pace.recommended ? t('pace.recommended') : undefined}
              color={pace.color}
              selectionRole="radio"
              selected={draft.pace === pace.id}
              onPress={() => update({ pace: pace.id })}
            >
              {deficit > 0 ? (
                <Text variant="caption" className="font-semibold" style={{ color: pace.color }}>
                  {t('pace.deficit', { kcal: deficit })}
                </Text>
              ) : null}
            </SelectCard>
          );
        })}
      </View>

      {plan ? <PlanWarnings plan={plan} formatWeight={formatWeight} className="mt-3" /> : null}

      {scenarios.length > 0 && draft.goalWeightKg ? (
        <View className="mt-5 rounded-2xl bg-muted p-4">
          <Text variant="caption" tone="muted" className="mb-3 font-bold uppercase tracking-wider">
            {t('pace.timelineTitle', { weight: formatWeight(draft.goalWeightKg, 0) })}
          </Text>
          <View className="gap-3">
            {scenarios.map((s) => {
              const pace = PACES.find((p) => p.id === s.pace)!;
              const active = s.pace === draft.pace;
              const label = s.weeks ? formatDuration(s.weeks) : t('pace.noLoss');
              return (
                <View
                  key={s.pace}
                  accessible
                  accessibilityLabel={`${t(`onboardingOptions.${s.pace}`)}: ${label}`}
                >
                  <View className="mb-1.5 flex-row justify-between">
                    <Text
                      variant="caption"
                      className={active ? 'font-bold' : 'font-medium'}
                      style={{ color: active ? pace.color : undefined }}
                    >
                      {pace.emoji} {t(`onboardingOptions.${s.pace}`)}
                    </Text>
                    <Text
                      variant="caption"
                      className="font-bold"
                      style={{ color: active ? pace.color : undefined }}
                    >
                      {label}
                    </Text>
                  </View>
                  <View className="h-2 overflow-hidden rounded-full bg-border">
                    <View
                      style={{
                        width: `${((s.weeks ?? maxWeeks) / maxWeeks) * 100}%`,
                        backgroundColor: active ? pace.color : `${pace.color}66`,
                      }}
                      className="h-full rounded-full"
                    />
                  </View>
                </View>
              );
            })}
          </View>
          <Text variant="caption" tone="muted" className="mt-3">
            {t('pace.timelineFoot', { kg: formatWeight(kgToLose) })}
          </Text>
        </View>
      ) : null}
    </>
  );
}
