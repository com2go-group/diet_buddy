import { View } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';
import type { ExerciseSession } from '@/lib/nutrition';
import { accentColor, useTheme } from '@/theme';

export function ExerciseCard({ sessions }: { sessions: ExerciseSession[] }) {
  const { scheme } = useTheme();
  const green = accentColor('green', scheme);
  return (
    <View className="rounded-3xl border border-success/20 bg-success/5 p-4">
      <View className="mb-2 flex-row items-center gap-2">
        <Text>🏋️</Text>
        <Text variant="label" accessibilityRole="header" className="font-extrabold">
          {t('initialPlan.exerciseTitle')}
        </Text>
      </View>
      {sessions.map((s, i) => {
        const days = s.days.map((d) => t(`weekdays.${d}`)).join(' / ');
        const duration = s.minutes ? t('initialPlan.minutes', { count: s.minutes }) : '—';
        const burn = s.kcal ? t('initialPlan.kcalApprox', { kcal: s.kcal }) : '—';
        return (
          <View
            key={i}
            accessible
            accessibilityLabel={`${days}: ${t(`exercise.${s.type}`)}, ${duration}, ${burn}`}
            className={`flex-row items-center justify-between py-2 ${i < sessions.length - 1 ? 'border-b border-success/10' : ''}`}
          >
            <View className="flex-1">
              <Text variant="label" className="font-bold">
                {days}
              </Text>
              <Text variant="caption" tone="muted">
                {t(`exercise.${s.type}`)}
              </Text>
            </View>
            <View className="items-end">
              <Text variant="label" className="font-bold" style={{ color: green }}>
                {duration}
              </Text>
              <Text variant="caption" tone="muted">
                {burn}
              </Text>
            </View>
          </View>
        );
      })}
      <Text variant="caption" tone="muted" className="mt-2">
        {t('initialPlan.exerciseNote')}
      </Text>
    </View>
  );
}
