import { View } from 'react-native';

import { Callout, Card, SelectCard, SelectTile, Text, TileGrid } from '@/components';
import { t } from '@/i18n';
import { formatDuration, formatLongDate, formatNumber } from '@/lib/format';

import { toggleGoal, type OnboardingDraft, type StepErrors } from '../../onboarding/draft';
import { ACTIVITY_LEVELS, GOALS, TRAINING_FREQUENCIES } from '../../onboarding/options';
import { FieldError } from '../../onboarding/steps/shared';
import { PlanWarnings } from '../../onboarding/steps/PlanWarnings';
import type { InitialPlan } from '../../plan/buildPlan';

type Update = (patch: Partial<OnboardingDraft>) => void;

function SectionTitle({ children }: { children: string }) {
  return (
    <Text variant="label" accessibilityRole="header" className="mt-2 font-bold">
      {children}
    </Text>
  );
}

/** Multi-select goals, with how each one sets the calorie target. */
export function GoalsSection({
  draft,
  update,
  errors,
}: {
  draft: OnboardingDraft;
  update: Update;
  errors: StepErrors;
}) {
  return (
    <View className="gap-2">
      <SectionTitle>{t('goalEdit.goals')}</SectionTitle>
      {GOALS.map((goal) => (
        <SelectCard
          key={goal.id}
          emoji={goal.emoji}
          title={t(`onboardingOptions.${goal.id}`)}
          description={t(`onboardingOptions.${goal.id}Desc`)}
          selected={draft.goals.includes(goal.id)}
          onPress={() => update(toggleGoal(draft, goal.id))}
        />
      ))}
      <FieldError error={errors.goals} />
      <Callout emoji="🧮">{t('goalEdit.howGoalsWork')}</Callout>
    </View>
  );
}

export function ActivitySection({ draft, update }: { draft: OnboardingDraft; update: Update }) {
  return (
    <View className="gap-2">
      <SectionTitle>{t('goalEdit.activity')}</SectionTitle>
      <Text variant="caption" tone="muted">
        {t('goalEdit.activityHint')}
      </Text>
      <View className="gap-2" accessibilityRole="radiogroup">
        {ACTIVITY_LEVELS.map((level) => (
          <SelectCard
            key={level.id}
            title={t(`onboardingOptions.${level.id}`)}
            description={t(`onboardingOptions.${level.id}Desc`)}
            trailing={`×${level.multiplier}`}
            selectionRole="radio"
            selected={draft.activity === level.id}
            onPress={() => update({ activity: level.id })}
          />
        ))}
      </View>
    </View>
  );
}

export function TrainingSection({ draft, update }: { draft: OnboardingDraft; update: Update }) {
  return (
    <View className="gap-2">
      <SectionTitle>{t('goalEdit.training')}</SectionTitle>
      <TileGrid>
        {TRAINING_FREQUENCIES.map((f) => (
          <SelectTile
            key={f}
            align="start"
            selectionRole="radio"
            label={t(`onboardingOptions.${f}`)}
            description={t(`onboardingOptions.${f}Desc`)}
            selected={draft.training === f}
            onPress={() => update({ training: f })}
          />
        ))}
      </TileGrid>
    </View>
  );
}

/** The new plan, with the steps that lead to its calorie target. */
export function PlanPreview({
  built,
  currentKcal,
  formatWeight,
}: {
  built: InitialPlan;
  currentKcal: number | null;
  formatWeight: (kg: number, decimals?: number) => string;
}) {
  const { plan } = built;
  const delta = plan.dailyCalorieDelta;
  return (
    <Card className="gap-1">
      <Text variant="label" className="font-bold">
        {t('goalEdit.newPlan')}
      </Text>
      <Text className="text-[14px]">
        {t('goalEdit.calories', { kcal: formatNumber(plan.dailyCalories) })}
      </Text>
      {currentKcal !== null && currentKcal !== plan.dailyCalories ? (
        <Text variant="caption" tone="muted">
          {t('goalEdit.was', { kcal: formatNumber(currentKcal) })}
        </Text>
      ) : null}
      <Text variant="caption" tone="muted">
        {t('goalEdit.burn', { bmr: formatNumber(plan.bmr), tdee: formatNumber(plan.tdee) })}
        {' · '}
        {delta === 0
          ? t('goalEdit.atBurn')
          : t(delta > 0 ? 'goalEdit.above' : 'goalEdit.below', {
              kcal: formatNumber(Math.abs(delta)),
            })}
      </Text>
      {plan.timeline ? (
        <Text className="text-[14px]">
          {t('goalEdit.eta', {
            date: formatLongDate(plan.timeline.goalDate),
            duration: formatDuration(plan.timeline.weeks),
          })}
        </Text>
      ) : null}
      <Text variant="caption" tone="muted">
        {t('goalEdit.replaces')}
      </Text>
      <PlanWarnings plan={plan} formatWeight={formatWeight} className="mt-2" />
    </Card>
  );
}
