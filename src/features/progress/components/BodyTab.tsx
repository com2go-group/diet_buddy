import { View } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';
import { formatDecimal, formatWeight } from '@/lib/format';
import { cmToIn, type UnitSystem } from '@/lib/nutrition';
import { accentColor, useTheme } from '@/theme';

import { metricChanges, type MetricKey, type MetricRow } from '../stats';

/** Body metrics (weight, BMI, waist, body fat) with change since the first entry. */
export function BodyTab({ metrics, units }: { metrics: MetricRow[]; units: UnitSystem }) {
  const { scheme } = useTheme();
  const changes = metricChanges(metrics);
  const imperial = units === 'imperial';
  const fmt: Record<MetricKey, (v: number) => string> = {
    weight_kg: (v) => formatWeight(v, units),
    bmi: (v) => formatDecimal(v),
    waist_cm: (v) => (imperial ? `${formatDecimal(cmToIn(v))} in` : `${formatDecimal(v)} cm`),
    body_fat_pct: (v) => `${formatDecimal(v)}%`,
  };
  const labels: Record<MetricKey, string> = {
    weight_kg: t('progress.weight'),
    bmi: t('progress.bmi'),
    waist_cm: t('progress.waist'),
    body_fat_pct: t('progress.bodyFat'),
  };
  const keys = Object.keys(labels) as MetricKey[];
  return (
    <>
      <View className="mb-4 flex-row flex-wrap gap-3">
        {keys.map((key) => {
          const m = changes[key];
          const change = m?.change ?? null;
          const changeText =
            change === null
              ? t('progress.noChange')
              : t('progress.sinceStart', {
                  change: `${change > 0 ? '+' : change < 0 ? '−' : ''}${fmt[key](Math.abs(change))}`,
                });
          return (
            <View
              key={key}
              accessible
              accessibilityLabel={`${labels[key]}: ${m ? `${fmt[key](m.current)}, ${changeText}` : t('progress.notMeasured')}`}
              className="rounded-2xl border border-border bg-card p-3.5"
              style={{ flexBasis: '47%', flexGrow: 1 }}
            >
              <Text variant="caption" tone="muted" className="font-semibold">
                {labels[key]}
              </Text>
              <Text className="mt-1 font-extrabold text-lg leading-6">
                {m ? fmt[key](m.current) : '—'}
              </Text>
              <Text
                variant="caption"
                className="mt-1 font-semibold"
                style={{
                  color:
                    change === null || change === 0
                      ? undefined
                      : accentColor(change < 0 ? 'green' : 'amber', scheme),
                }}
                tone={change === null || change === 0 ? 'muted' : 'default'}
              >
                {m ? changeText : t('progress.notMeasured')}
              </Text>
            </View>
          );
        })}
      </View>
      <View className="mb-4 items-center gap-2 rounded-2xl border border-dashed border-border bg-card p-6">
        <Text className="text-3xl leading-10">📸</Text>
        <Text variant="heading" className="text-base">
          {t('progress.photosTitle')}
        </Text>
        <Text tone="muted" className="text-center text-[13px]">
          {t('progress.photosSoon')}
        </Text>
      </View>
    </>
  );
}
