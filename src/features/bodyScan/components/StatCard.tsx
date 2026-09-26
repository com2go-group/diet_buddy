import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { NumberField, Text } from '@/components';
import { t } from '@/i18n';
import { formatNumber } from '@/lib/format';
import { kgToLb, lbToKg, type UnitSystem } from '@/lib/nutrition';
import { accentColor, MIN_TOUCH_TARGET, useTheme, type Accent } from '@/theme';

import { METRIC_RANGES, parseEdit, type MetricKey } from '../results';

/** Metric colours from the prototype, contrast-adjusted in light mode. */
const COLORS: Record<MetricKey, Accent> = {
  bodyFat: 'amber',
  leanMass: 'green',
  fatMass: 'blue',
  bmr: 'violet',
  tdee: 'red',
  bmi: 'cyan',
};

const MASS: readonly MetricKey[] = ['leanMass', 'fatMass'];

export interface StatCardProps {
  metric: MetricKey;
  /** Value in metric units (kg for masses). */
  value: number;
  units: UnitSystem;
  subLabel: string;
  onEdit: (value: number) => void;
}

/** An editable result card: value, explanation on demand, inline edit with range check. */
export function StatCard({ metric, value, units, subLabel, onEdit }: StatCardProps) {
  const { scheme, colors } = useTheme();
  const color = accentColor(COLORS[metric], scheme);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<number | null>(null);
  const [error, setError] = useState<string>();
  const [info, setInfo] = useState(false);

  const isMass = MASS.includes(metric);
  const toDisplay = (kg: number) => (isMass && units === 'imperial' ? kgToLb(kg) : kg);
  const range = METRIC_RANGES[metric];
  const unit = isMass
    ? units === 'imperial'
      ? 'lb'
      : 'kg'
    : metric === 'bodyFat'
      ? '%'
      : metric === 'bmi'
        ? ''
        : 'kcal';
  const label = t(`bodyScan.${metric}`);
  const shown =
    metric === 'bmr' || metric === 'tdee'
      ? `${formatNumber(value)} kcal`
      : `${toDisplay(value).toFixed(1)}${unit === '%' || unit === '' ? unit : ` ${unit}`}`;

  const start = () => {
    setDraft(Number(toDisplay(value).toFixed(range.decimals)));
    setError(undefined);
    setEditing(true);
  };
  const commit = () => {
    const kg = draft === null ? null : isMass && units === 'imperial' ? lbToKg(draft) : draft;
    const parsed = parseEdit(metric, kg);
    if ('error' in parsed) {
      const min = Math.round(toDisplay(range.min));
      const max = Math.round(toDisplay(range.max));
      setError(t('bodyScan.outOfRange', { min, max }));
      return;
    }
    onEdit(parsed.value);
    setEditing(false);
  };

  return (
    <View
      className="flex-1 rounded-2xl border-[1.5px] bg-card p-3.5"
      style={{ borderColor: editing ? color : colors.border, minWidth: 0 }}
    >
      <View className="flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('bodyScan.info', { metric: label })}
          aria-expanded={info}
          onPress={() => setInfo((v) => !v)}
          style={{ minHeight: MIN_TOUCH_TARGET }}
          className="flex-1 flex-row items-center gap-1"
        >
          <Text variant="caption" tone="muted" className="font-semibold">
            {label} {info ? '▲' : 'ⓘ'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            editing ? t('bodyScan.cancel') : t('bodyScan.editLabel', { metric: label })
          }
          onPress={editing ? () => setEditing(false) : start}
          style={{ minHeight: MIN_TOUCH_TARGET, minWidth: MIN_TOUCH_TARGET }}
          className="items-end justify-center"
        >
          {editing ? (
            <Feather name="x" size={16} color={colors.mutedForeground} />
          ) : (
            <View
              className="flex-row items-center gap-1 rounded-lg px-2 py-1"
              style={{ backgroundColor: `${color}1F` }}
            >
              <Feather name="edit-2" size={10} color={color} />
              <Text variant="caption" className="font-bold" style={{ color }}>
                {t('bodyScan.edit')}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
      {info ? (
        <Text variant="caption" tone="muted" className="mb-1.5 leading-4">
          {t(`bodyScan.${metric}Desc`)}
        </Text>
      ) : null}
      {editing ? (
        <View className="gap-1">
          <View className="flex-row items-end gap-2">
            <NumberField
              className="flex-1"
              label={label}
              unit={unit || undefined}
              decimals={range.decimals}
              value={draft}
              onChangeValue={setDraft}
              onSubmitEditing={commit}
              autoFocus
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('bodyScan.confirm', { metric: label })}
              onPress={commit}
              style={{
                width: MIN_TOUCH_TARGET,
                height: MIN_TOUCH_TARGET + 6,
                backgroundColor: color,
              }}
              className="items-center justify-center rounded-md"
            >
              <Feather name="check" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
          <Text
            variant="caption"
            tone={error ? 'destructive' : 'muted'}
            accessibilityLiveRegion="polite"
          >
            {error ??
              t('bodyScan.range', {
                min: Math.round(toDisplay(range.min)),
                max: Math.round(toDisplay(range.max)),
              })}
          </Text>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${shown}. ${subLabel}`}
          onPress={start}
        >
          <Text className="mt-0.5 font-extrabold text-[21px] leading-7" style={{ color }}>
            {shown}
          </Text>
          <Text variant="caption" tone="muted" className="mt-1">
            {subLabel}
          </Text>
          {metric === 'bodyFat' || metric === 'bmi' ? (
            <View className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, (value / (metric === 'bmi' ? 40 : 50)) * 100)}%`,
                  backgroundColor: color,
                }}
              />
            </View>
          ) : null}
        </Pressable>
      )}
    </View>
  );
}
