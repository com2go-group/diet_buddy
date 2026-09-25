import { View } from 'react-native';

import { Callout, ErrorState, Text } from '@/components';
import { t } from '@/i18n';
import { formatLongDate, formatMonthYear, formatNumber } from '@/lib/format';
import { brand } from '@/theme';
import { computePlan } from '@/lib/nutrition';

import { goalDateFrom, planInputFrom } from '../draft';
import { GOALS, MOTIVATIONS } from '../options';
import { PlanWarnings } from './PlanWarnings';
import { StepHeader, type StepProps } from './shared';

/** Final onboarding step: the calculated plan (CLAUDE.md §7.2, step 16). */
export function PlanStep({ draft, formatWeight }: StepProps) {
  const input = planInputFrom(draft);
  if (!input) return <ErrorState />;
  const plan = computePlan(input);
  const losing = draft.goals.includes('lose_fat');
  const estimate = plan.timeline?.goalDate ?? goalDateFrom(draft);

  const stats = [
    {
      label: t('aiPlan.currentWeight'),
      value: formatWeight(input.body.weightKg),
      color: '#94A3B8',
    },
    ...(losing && draft.goalWeightKg
      ? [
          {
            label: t('aiPlan.goalWeight'),
            value: formatWeight(draft.goalWeightKg),
            color: brand.gradient[0],
          },
          {
            label: t('aiPlan.weeklyRate'),
            value: t('aiPlan.perWeek', { rate: formatWeight(Math.abs(plan.weeklyChangeKg), 2) }),
            color: '#EF4444',
          },
        ]
      : []),
    {
      label: t('aiPlan.dailyCalories'),
      value: `${formatNumber(plan.dailyCalories)} kcal`,
      color: brand.success,
    },
    { label: t('aiPlan.proteinTarget'), value: `${plan.macros.proteinG} g`, color: brand.carbs },
    ...(estimate
      ? [{ label: t('aiPlan.estimatedDate'), value: formatMonthYear(estimate), color: brand.fat }]
      : []),
  ];
  const macros = [
    {
      label: t('macros.protein'),
      grams: plan.macros.proteinG,
      pct: plan.macros.pct.protein,
      color: brand.protein,
    },
    {
      label: t('macros.carbs'),
      grams: plan.macros.carbsG,
      pct: plan.macros.pct.carbs,
      color: brand.carbs,
    },
    { label: t('macros.fat'), grams: plan.macros.fatG, pct: plan.macros.pct.fat, color: brand.fat },
  ];
  const optionList = (ids: string[], fallback: string) =>
    ids.length ? ids.map((id) => t(`onboardingOptions.${id as 'keto'}`)).join(', ') : fallback;

  return (
    <>
      <StepHeader
        emoji="🎉"
        title={t('aiPlan.title')}
        subtitle={t('aiPlan.subtitle', { date: formatLongDate(new Date()) })}
      />
      <View className="gap-4">
        <View
          className="rounded-3xl border border-primary/25 p-5"
          style={{ backgroundColor: '#1A1A2E' }}
        >
          <Text
            variant="caption"
            className="font-bold uppercase tracking-wider"
            style={{ color: '#94A3B8' }}
          >
            {t('aiPlan.eyebrow')}
          </Text>
          <Text variant="heading" className="mb-3 font-extrabold" style={{ color: '#F1F5F9' }}>
            {draft.name.trim()}
          </Text>
          <View className="mb-3 flex-row flex-wrap gap-1.5">
            {draft.goals.map((g) => (
              <View key={g} className="rounded-full bg-primary/20 px-2.5 py-1">
                <Text variant="caption" tone="primary" className="font-extrabold">
                  {GOALS.find((x) => x.id === g)?.emoji} {t(`onboardingOptions.${g}`)}
                </Text>
              </View>
            ))}
          </View>
          <View className="flex-row flex-wrap gap-2.5">
            {stats.map((s) => (
              <View
                key={s.label}
                accessible
                accessibilityLabel={`${s.label}: ${s.value}`}
                style={{
                  width: '47.5%',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
                className="rounded-2xl border px-3 py-3"
              >
                <Text variant="caption" style={{ color: '#94A3B8' }}>
                  {s.label}
                </Text>
                <Text
                  variant="heading"
                  className="mt-0.5 font-extrabold"
                  style={{ color: s.color }}
                >
                  {s.value}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <PlanWarnings plan={plan} formatWeight={formatWeight} />

        <View className="rounded-2xl border border-border bg-card p-4">
          <Text variant="label" className="mb-3 font-bold">
            {t('aiPlan.macroSplit')}
          </Text>
          <View className="mb-3 h-3 flex-row overflow-hidden rounded-full">
            {macros.map((m) => (
              <View key={m.label} style={{ width: `${m.pct}%`, backgroundColor: m.color }} />
            ))}
          </View>
          <View className="flex-row gap-4">
            {macros.map((m) => (
              <View
                key={m.label}
                accessible
                accessibilityLabel={`${m.label}: ${m.grams} g, ${m.pct}%`}
                className="flex-row items-center gap-1.5"
              >
                <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                <View>
                  <Text variant="label" className="font-bold">
                    {m.grams}g · {m.pct}%
                  </Text>
                  <Text variant="caption" tone="muted">
                    {m.label}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {draft.motivations.length > 0 ? (
          <View className="rounded-2xl border border-border bg-card p-4">
            <Text variant="label" className="mb-2.5 font-bold">
              {t('aiPlan.motivations')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {draft.motivations.map((id) => (
                <View
                  key={id}
                  className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5"
                >
                  <Text variant="caption" tone="primary" className="font-semibold">
                    {MOTIVATIONS.find((m) => m.id === id)?.emoji}{' '}
                    {t(`onboardingOptions.${id as 'health'}`)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View className="flex-row flex-wrap gap-2">
          {[
            {
              label: t('aiPlan.activity'),
              value: draft.activity ? t(`onboardingOptions.${draft.activity}`) : '—',
            },
            {
              label: t('aiPlan.training'),
              value: draft.training ? t(`onboardingOptions.${draft.training}`) : '—',
            },
            {
              label: t('aiPlan.dietStyle'),
              value: optionList(draft.dietStyles, t('onboardingOptions.no_preference')),
            },
            {
              label: t('aiPlan.restrictions'),
              value: optionList(draft.restrictions, t('aiPlan.none')),
            },
          ].map((s) => (
            <View
              key={s.label}
              accessible
              style={{ width: '48.5%' }}
              className="rounded-xl bg-muted px-3 py-2.5"
            >
              <Text variant="caption" tone="muted">
                {s.label}
              </Text>
              <Text variant="label" className="mt-0.5 font-bold">
                {s.value}
              </Text>
            </View>
          ))}
        </View>

        <Callout emoji="ℹ️" tone="info">
          {t('common.notMedicalAdvice')}
        </Callout>
      </View>
    </>
  );
}
