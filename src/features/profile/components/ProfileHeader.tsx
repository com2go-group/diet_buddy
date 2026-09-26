import { View } from 'react-native';

import { GradientFill, Text } from '@/components';
import { t } from '@/i18n';
import { formatNumber } from '@/lib/format';

export function ProfileHeader({
  name,
  contact,
  premium,
  stats,
}: {
  name: string;
  contact: string;
  premium: boolean;
  stats: { loggedDays: number; mealsLogged: number; goalProgress: number | null };
}) {
  const items = [
    { label: t('profile.loggedDays'), value: formatNumber(stats.loggedDays) },
    { label: t('profile.mealsLogged'), value: formatNumber(stats.mealsLogged) },
    {
      label: t('profile.goalProgress'),
      value: stats.goalProgress === null ? '—' : `${stats.goalProgress}%`,
    },
  ];
  return (
    <View className="mb-4 rounded-3xl p-5" style={{ backgroundColor: '#1A1A2E' }}>
      <View className="mb-4 flex-row items-center gap-3">
        <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-full">
          <GradientFill id="profileAvatar" />
          <Text className="font-extrabold text-xl text-white">
            {name.trim().charAt(0).toUpperCase() || '🙂'}
          </Text>
        </View>
        <View className="flex-1">
          <Text
            className="font-extrabold text-lg"
            style={{ color: '#F1F5F9' }}
            accessibilityRole="header"
          >
            {name}
          </Text>
          <Text variant="caption" style={{ color: '#94A3B8' }} numberOfLines={1}>
            {contact}
          </Text>
        </View>
        <View
          className="rounded-full px-2.5 py-1"
          style={{ backgroundColor: premium ? '#F59E0B' : 'rgba(255,255,255,0.1)' }}
        >
          <Text
            variant="caption"
            className="font-bold"
            style={{ color: premium ? '#1A1A2E' : '#F1F5F9' }}
          >
            {premium ? `👑 ${t('profile.premium')}` : t('profile.free')}
          </Text>
        </View>
      </View>
      <View className="flex-row">
        {items.map((s) => (
          <View
            key={s.label}
            accessible
            accessibilityLabel={`${s.label}: ${s.value}`}
            className="flex-1 items-center"
          >
            <Text className="font-extrabold text-lg" style={{ color: '#F59E0B' }}>
              {s.value}
            </Text>
            <Text variant="caption" style={{ color: '#94A3B8' }}>
              {s.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
