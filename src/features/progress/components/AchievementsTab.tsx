import { View } from 'react-native';

import { ProgressBar, Text } from '@/components';
import { t } from '@/i18n';
import { formatDecimal, formatNumber } from '@/lib/format';
import { accentColor, useTheme } from '@/theme';

import type { AchievementView } from '../api';

/** Achievement list: unlocked ones with their date, locked ones with progress. */
export function AchievementsTab({ achievements }: { achievements: AchievementView[] }) {
  const { scheme } = useTheme();
  const unlocked = achievements.filter((a) => a.unlockedAt);
  const xp = unlocked.reduce((sum, a) => sum + a.xp, 0);
  const amber = accentColor('amber', scheme);
  return (
    <>
      <View className="mb-4 flex-row items-center gap-3 rounded-2xl border border-primary/25 bg-primary/10 p-4">
        <Text className="text-3xl leading-10">🏆</Text>
        <View className="flex-1">
          <Text variant="heading" className="text-base">
            {t('progress.unlocked', { count: unlocked.length, total: achievements.length })}
          </Text>
          <Text variant="caption" tone="muted" className="text-[13px]">
            {t('progress.earnedXp', { xp: formatNumber(xp) })}
          </Text>
        </View>
      </View>
      <View className="mb-4 gap-3">
        {achievements.map((a) => {
          const done = Boolean(a.unlockedAt);
          const progress = `${formatDecimal(a.current)} / ${formatDecimal(a.target)}`;
          return (
            <View
              key={a.code}
              accessible
              accessibilityLabel={`${a.title}. ${a.description}. ${
                done
                  ? t('progress.achievementUnlocked', {
                      date: new Date(a.unlockedAt!).toLocaleDateString('en-GB'),
                    })
                  : `${t('progress.achievementLocked')}, ${progress}`
              }. ${t('progress.xpReward', { xp: a.xp })}`}
              className={`flex-row items-center gap-3 rounded-2xl p-3.5 ${done ? 'border border-border bg-card' : 'bg-muted'}`}
            >
              <View
                className={`h-12 w-12 items-center justify-center rounded-xl ${done ? 'bg-accent' : 'bg-card'}`}
              >
                <Text className="text-2xl leading-8">{done ? a.emoji : '🔒'}</Text>
              </View>
              <View className="flex-1 gap-1">
                <Text variant="label" className="font-bold text-[15px]">
                  {a.title}
                </Text>
                <Text variant="caption" tone="muted">
                  {a.description}
                </Text>
                {done ? (
                  <Text variant="caption" tone="success" className="font-semibold">
                    ✓{' '}
                    {t('progress.achievementUnlocked', {
                      date: new Date(a.unlockedAt!).toLocaleDateString('en-GB'),
                    })}
                  </Text>
                ) : (
                  <View className="flex-row items-center gap-2">
                    <View className="flex-1">
                      <ProgressBar value={a.current / a.target} label={`${a.title} ${progress}`} />
                    </View>
                    <Text variant="caption" tone="muted" className="font-semibold">
                      {progress}
                    </Text>
                  </View>
                )}
              </View>
              <Text variant="caption" className="font-bold" style={{ color: amber }}>
                {t('progress.xpReward', { xp: a.xp })}
              </Text>
            </View>
          );
        })}
      </View>
    </>
  );
}
