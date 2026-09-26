import { useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';
import { formatShortDate, formatWeight } from '@/lib/format';
import type { UnitSystem } from '@/lib/nutrition';

import type { MetricRow } from '../stats';
import type { ProgressPhoto } from './api';
import { compare } from './compare';

function Picker({
  label,
  photos,
  value,
  onChange,
}: {
  label: string;
  photos: ProgressPhoto[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2"
      >
        {photos.map((p) => {
          const selected = p.id === value;
          return (
            <Pressable
              key={p.id}
              accessibilityRole="radio"
              aria-checked={selected}
              accessibilityLabel={formatShortDate(new Date(p.takenAt))}
              onPress={() => onChange(p.id)}
              className={`min-h-11 items-center justify-center rounded-xl border-2 px-3 ${selected ? 'border-primary bg-accent' : 'border-border bg-card'}`}
            >
              <Text className="font-semibold text-[13px]">
                {formatShortDate(new Date(p.takenAt))}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Two photos side by side with the time and weight between them (Premium). */
export function PhotoCompare({
  photos,
  metrics,
  units,
}: {
  photos: ProgressPhoto[];
  metrics: MetricRow[];
  units: UnitSystem;
}) {
  const [beforeId, setBeforeId] = useState(photos[0]!.id);
  const [afterId, setAfterId] = useState(photos[photos.length - 1]!.id);
  const before = photos.find((p) => p.id === beforeId) ?? photos[0]!;
  const after = photos.find((p) => p.id === afterId) ?? photos[photos.length - 1]!;
  const summary = compare(metrics, before.takenAt, after.takenAt);
  const change = summary.weightChangeKg;

  const side = (label: string, p: ProgressPhoto) => {
    const date = formatShortDate(new Date(p.takenAt));
    return (
      <View className="flex-1 gap-1.5">
        <Text variant="caption" tone="muted" className="font-semibold">
          {label} · {date}
        </Text>
        {p.url ? (
          <Image
            source={{ uri: p.url }}
            accessibilityLabel={`${label}: ${t('progress.photoLabel', { date })}`}
            resizeMode="cover"
            style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: 12 }}
          />
        ) : (
          <View className="aspect-[3/4] items-center justify-center rounded-xl bg-muted">
            <Text variant="caption" tone="muted">
              {t('progress.photoUnavailable')}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View className="gap-3">
      <View className="flex-row gap-3">
        {side(t('progress.compareBefore'), before)}
        {side(t('progress.compareAfter'), after)}
      </View>
      <Text className="text-center font-semibold" accessibilityLiveRegion="polite">
        {t('progress.compareDays', { days: summary.days })}
        {change !== null
          ? ` · ${t('progress.compareWeight', {
              change: `${change > 0 ? '+' : change < 0 ? '−' : ''}${formatWeight(Math.abs(change), units)}`,
            })}`
          : ''}
      </Text>
      <Text variant="caption" tone="muted">
        {t('progress.compareBefore')}
      </Text>
      <Picker
        label={t('progress.compareChooseBefore')}
        photos={photos}
        value={before.id}
        onChange={setBeforeId}
      />
      <Text variant="caption" tone="muted">
        {t('progress.compareAfter')}
      </Text>
      <Picker
        label={t('progress.compareChooseAfter')}
        photos={photos}
        value={after.id}
        onChange={setAfterId}
      />
    </View>
  );
}
