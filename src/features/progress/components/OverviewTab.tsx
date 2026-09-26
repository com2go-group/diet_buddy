import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Button, Text } from '@/components';
import { t } from '@/i18n';
import { dayKey } from '@/lib/dates';
import { formatDecimal, formatMonthYear, formatNumber, formatWeight } from '@/lib/format';
import { kgToLb } from '@/lib/nutrition';
import { accentColor, useTheme } from '@/theme';

import type { ProgressData } from '../api';
import { averageCalories, dailyCalories, projection, trendPerWeek, weightSeries } from '../stats';
import { CalorieBars } from './CalorieBars';
import { StatTile } from './StatTile';
import { WeightChart } from './WeightChart';

const signed = (text: string, value: number) =>
  value > 0 ? `+${text}` : value < 0 ? `−${text}` : text;

function Card({ children }: { children: ReactNode }) {
  return <View className="mb-4 rounded-2xl border border-border bg-card p-4">{children}</View>;
}

export function OverviewTab({ data, now }: { data: ProgressData; now: Date }) {
  const { scheme } = useTheme();
  const units = data.profile.units;
  const w = (kg: number, d = 1) => formatWeight(Math.abs(kg), units, d);
  const series = weightSeries(data.metrics, now);
  const latest = series[series.length - 1] ?? null;
  const losing = data.goal?.types.includes('lose_fat') ?? false;
  const start = data.goal?.startKg ?? series[0]?.kg ?? null;
  const change = latest && start !== null ? latest.kg - start : null;
  const days = dailyCalories(data.food, now);
  const avg = averageCalories(days);
  const monthKey = dayKey(now).slice(0, 7);
  const checkinsThisMonth = data.checkins.filter((c) => c.date.startsWith(monthKey)).length;
  const trend = trendPerWeek(series, now);
  const goalKg = data.goal?.goalKg ?? null;
  const proj =
    losing && latest && goalKg !== null && data.plan?.weeklyChangeKg
      ? projection(latest.kg, goalKg, data.plan.weeklyChangeKg, now)
      : null;
  const green = accentColor('green', scheme);

  return (
    <>
      <View className="mb-3">
        <Button label={t('story.open')} variant="outline" onPress={() => router.push('/story')} />
      </View>
      <View className="mb-3 flex-row gap-3">
        <StatTile
          emoji="📉"
          value={
            change === null
              ? t('progress.none')
              : losing
                ? change <= 0
                  ? w(change)
                  : `+${w(change)}`
                : signed(w(change), change)
          }
          label={losing ? t('progress.totalLost') : t('progress.totalChange')}
        />
        <StatTile
          emoji="🔥"
          value={t('progress.streakDays', { count: data.profile.streak_days })}
          label={t('progress.streak')}
        />
      </View>
      <View className="mb-5 flex-row gap-3">
        <StatTile
          emoji="🍽️"
          value={avg === null ? t('progress.none') : formatNumber(avg)}
          label={`${t('progress.avgCalories')} · ${t('progress.avgCaloriesHint')}`}
        />
        <StatTile
          emoji="✅"
          value={t('progress.checkinsMonth', { count: checkinsThisMonth })}
          label={t('progress.checkins')}
        />
      </View>

      <Card>
        <View className="mb-3 flex-row items-start justify-between">
          <View>
            <Text variant="heading" accessibilityRole="header" className="text-base">
              {t('progress.weightTrend')}
            </Text>
            {series.length > 1 && change !== null ? (
              <Text
                variant="label"
                className="mt-0.5 font-bold"
                style={{ color: change <= 0 ? green : accentColor('amber', scheme) }}
              >
                {t('progress.weightChange', {
                  change: signed(
                    w(series[series.length - 1]!.kg - series[0]!.kg),
                    series[series.length - 1]!.kg - series[0]!.kg,
                  ),
                  days: Math.max(
                    1,
                    Math.round((latest!.date.getTime() - series[0]!.date.getTime()) / 86_400_000),
                  ),
                })}
              </Text>
            ) : null}
          </View>
          {latest ? (
            <View className="items-end">
              <Text className="font-extrabold text-[22px] leading-7">
                {formatDecimal(units === 'imperial' ? kgToLb(latest.kg) : latest.kg)}
              </Text>
              <Text variant="caption" tone="muted">
                {t('progress.latest', {
                  unit: units === 'imperial' ? t('units.lb') : t('units.kg'),
                })}
              </Text>
            </View>
          ) : null}
        </View>
        {series.length > 1 ? (
          <WeightChart
            points={series}
            format={(kg) => formatWeight(kg, units, 0)}
            label={t('progress.weightChart', {
              from: w(series[0]!.kg),
              to: w(latest!.kg),
              days: Math.round((latest!.date.getTime() - series[0]!.date.getTime()) / 86_400_000),
            })}
          />
        ) : (
          <Text tone="muted" className="text-[13px]">
            {t('progress.weightEmpty')}
          </Text>
        )}
      </Card>

      <Card>
        <Text variant="heading" accessibilityRole="header" className="mb-3 text-base">
          {t('progress.weeklyCalories')}
        </Text>
        <CalorieBars days={days} target={data.plan?.dailyCalories ?? null} />
      </Card>

      {losing && goalKg !== null && latest ? (
        <View className="mb-4 gap-2 rounded-2xl border border-success/20 bg-success/10 p-4">
          <Text variant="heading" accessibilityRole="header" className="text-base">
            🎯 {t('progress.projectionTitle')}
          </Text>
          {proj ? (
            <>
              <Text className="text-[15px] leading-6">
                {t('progress.projection', {
                  rate: w(data.plan!.weeklyChangeKg!, 2),
                  goal: w(goalKg, 0),
                  date: formatMonthYear(proj.date),
                })}
              </Text>
              <Text variant="label" className="font-bold" style={{ color: green }}>
                {t('progress.projectionLeft', { kg: w(proj.toLoseKg) })}
              </Text>
            </>
          ) : latest.kg <= goalKg ? (
            <Text className="text-[15px]">{t('progress.projectionReached')}</Text>
          ) : null}
          <Text variant="caption" tone="muted" className="text-[13px]">
            {trend === null
              ? t('progress.trendNone')
              : t('progress.trend', { rate: signed(w(trend, 2), trend) })}
          </Text>
          <Text variant="caption" tone="muted">
            {t('progress.projectionNote')}
          </Text>
        </View>
      ) : null}
    </>
  );
}
