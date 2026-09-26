import { View } from 'react-native';

import { Button, Text } from '@/components';
import { t } from '@/i18n';
import { formatWeight } from '@/lib/format';
import type { UnitSystem } from '@/lib/nutrition';
import { accentColor, useTheme } from '@/theme';

import { coachMessage, type CheckInAnswers } from '../logic';

/** Completion screen: Aria's note, a summary of the answers and the XP earned. */
export function CheckInDone({
  answers,
  units,
  onClose,
}: {
  answers: CheckInAnswers;
  units: UnitSystem;
  onClose: () => void;
}) {
  const { scheme } = useTheme();
  const amber = accentColor('amber', scheme);
  const mood = t(`checkIn.moods.${answers.mood}`);
  const tiles = [
    { label: t('checkIn.moodLabel'), value: mood },
    { label: t('checkIn.energyLabel'), value: `${answers.energy}/10` },
    { label: t('checkIn.sleepLabel'), value: t('checkIn.hours', { count: answers.sleepHours }) },
    {
      label: t('checkIn.weightLabel'),
      value: answers.weightKg === null ? '—' : formatWeight(answers.weightKg, units),
    },
  ];
  return (
    <View className="flex-1 justify-center gap-5 px-6">
      <Text className="text-center text-[64px] leading-[76px]">🎉</Text>
      <Text variant="title" accessibilityRole="header" className="text-center">
        {t('checkIn.doneTitle')}
      </Text>
      <View className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <Text variant="caption" tone="muted" className="mb-1.5 font-bold uppercase tracking-wider">
          {t('checkIn.coachSays')}
        </Text>
        <Text className="leading-6">
          {t(`checkIn.${coachMessage(answers.mood)}`, {
            mood: mood.toLowerCase(),
            energy: answers.energy,
          })}
        </Text>
      </View>
      <View className="flex-row flex-wrap gap-2.5">
        {tiles.map((tile) => (
          <View
            key={tile.label}
            accessible
            className="rounded-2xl border border-border bg-card px-4 py-3"
            style={{ flexBasis: '47%', flexGrow: 1 }}
          >
            <Text variant="caption" tone="muted" className="font-semibold">
              {tile.label}
            </Text>
            <Text className="mt-0.5 font-bold text-base" style={{ color: amber }}>
              {tile.value}
            </Text>
          </View>
        ))}
      </View>
      <Text variant="label" className="text-center font-bold" style={{ color: amber }}>
        🔥 {t('checkIn.xpEarned')}
      </Text>
      <Button label={t('checkIn.backHome')} size="lg" onPress={onClose} />
    </View>
  );
}
