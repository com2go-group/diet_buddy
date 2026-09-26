import { View } from 'react-native';

import { Ring, Text } from '@/components';
import { t } from '@/i18n';
import { ACCENTS } from '@/theme';

import { scoreMessage } from '../summary';

const MESSAGES = {
  none: 'homeScreen.scoreNone',
  low: 'homeScreen.scoreLow',
  mid: 'homeScreen.scoreMid',
  high: 'homeScreen.scoreHigh',
} as const;

/** Today's Score (adherence) with streak and XP, on the prototype's dark card. */
export function ScoreCard({
  score,
  streak,
  xp,
}: {
  score: number | null;
  streak: number;
  xp: number;
}) {
  return (
    <View
      className="mb-4 flex-row items-center gap-4 rounded-3xl p-4"
      style={{ backgroundColor: '#1A1A2E' }}
    >
      <Ring
        value={score ?? 0}
        max={100}
        size={112}
        strokeWidth={10}
        color={ACCENTS.amber.dark}
        label={t('homeScreen.todaysScore')}
      >
        <Text className="font-extrabold text-[26px] leading-8" style={{ color: '#F1F5F9' }}>
          {score === null ? t('homeScreen.noScore') : `${score}%`}
        </Text>
        <Text
          variant="caption"
          className="font-semibold uppercase tracking-wider"
          style={{ color: '#94A3B8' }}
        >
          {score !== null && score >= 80 ? t('homeScreen.onTrack') : t('homeScreen.today')}
        </Text>
      </Ring>
      <View className="flex-1">
        <Text
          variant="caption"
          className="font-semibold uppercase tracking-wider"
          style={{ color: '#94A3B8' }}
        >
          {t('homeScreen.todaysScore')}
        </Text>
        <Text className="mt-1 font-medium text-[15px] leading-5" style={{ color: '#F1F5F9' }}>
          {t(MESSAGES[scoreMessage(score)])}
        </Text>
        <View className="mt-3 flex-row flex-wrap gap-3">
          <Text variant="label" className="font-bold" style={{ color: ACCENTS.amber.dark }}>
            🔥 {t('homeScreen.streak', { count: streak })}
          </Text>
          <Text variant="label" className="font-bold" style={{ color: ACCENTS.green.dark }}>
            ⚡ {t('homeScreen.xp', { count: xp })}
          </Text>
        </View>
      </View>
    </View>
  );
}
