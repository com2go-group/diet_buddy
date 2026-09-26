import { View } from 'react-native';

import { Card, Text } from '@/components';
import { t } from '@/i18n';
import { estimateCompositionBreakdown } from '@/lib/nutrition';
import { brand } from '@/theme';

/** Fat / muscle / water / bone split, always labelled as an estimate (CLAUDE.md §7.3). */
export function CompositionCard({
  bodyFatPct,
  caption,
}: {
  bodyFatPct: number;
  caption: string | null;
}) {
  const b = estimateCompositionBreakdown(bodyFatPct);
  const bars = [
    { key: 'fat', pct: b.fatPct, color: brand.gradient[0] },
    { key: 'muscle', pct: b.musclePct, color: brand.protein },
    { key: 'water', pct: b.waterPct, color: brand.carbs },
    { key: 'bone', pct: b.bonePct, color: brand.fat },
  ] as const;
  return (
    <Card className="flex-row items-center gap-5">
      <View className="items-center">
        <Text
          className="text-6xl leading-[72px]"
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          🧍
        </Text>
        {caption ? (
          <Text variant="caption" tone="muted">
            {caption}
          </Text>
        ) : null}
      </View>
      <View className="flex-1">
        <View className="mb-2.5 flex-row items-center justify-between">
          <Text variant="label" className="font-bold">
            {t('bodyScan.composition')}
          </Text>
          <View className="rounded-full bg-muted px-2 py-0.5">
            <Text variant="caption" tone="muted" className="font-bold">
              {t('bodyScan.compositionEstimate')}
            </Text>
          </View>
        </View>
        {bars.map((bar) => (
          <View
            key={bar.key}
            accessible
            accessibilityLabel={`${t(`bodyScan.${bar.key}`)} ${bar.pct}%, ${t('bodyScan.compositionEstimate')}`}
            className="mb-2 flex-row items-center gap-2"
          >
            <Text variant="caption" tone="muted" className="w-12">
              {t(`bodyScan.${bar.key}`)}
            </Text>
            <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <View
                className="h-full rounded-full"
                style={{ width: `${bar.pct}%`, backgroundColor: bar.color }}
              />
            </View>
            <Text variant="caption" className="w-9 text-right font-bold">
              {bar.pct}%
            </Text>
          </View>
        ))}
        <Text variant="caption" tone="muted" className="mt-1">
          {t('bodyScan.compositionNote')}
        </Text>
      </View>
    </Card>
  );
}
