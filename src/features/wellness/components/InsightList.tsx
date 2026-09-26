import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Card, Chip, Text } from '@/components';
import { t, type StringKey } from '@/i18n';

import type { WellnessInsight, WellnessTheme } from '../api';

const themeLabel = (theme: WellnessTheme) => t(`wellness.theme_${theme}` as StringKey);

/** Insight cards with theme filter chips (only themes present, plus All). */
export function InsightList({ insights }: { insights: WellnessInsight[] }) {
  const [filter, setFilter] = useState<WellnessTheme | null>(null);
  const themes = [...new Set(insights.map((i) => i.theme))];
  const shown = filter ? insights.filter((i) => i.theme === filter) : insights;
  return (
    <View className="gap-3">
      {themes.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2"
        >
          <Chip
            label={t('wellness.all')}
            selectionRole="radio"
            selected={filter === null}
            onPress={() => setFilter(null)}
          />
          {themes.map((theme) => (
            <Chip
              key={theme}
              label={themeLabel(theme)}
              selectionRole="radio"
              selected={filter === theme}
              onPress={() => setFilter(theme)}
            />
          ))}
        </ScrollView>
      ) : null}
      {shown.map((insight) => (
        <Card key={`${insight.theme}-${insight.title}`} className="gap-1.5">
          <View className="flex-row items-center gap-2">
            <Text
              className="text-xl leading-7"
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              {insight.emoji}
            </Text>
            <Text className="flex-1 font-bold" accessibilityRole="header">
              {insight.title}
            </Text>
          </View>
          <Text variant="caption" tone="primary" className="font-semibold">
            {themeLabel(insight.theme)}
          </Text>
          <Text className="text-[14px] leading-5">{insight.body}</Text>
        </Card>
      ))}
    </View>
  );
}
