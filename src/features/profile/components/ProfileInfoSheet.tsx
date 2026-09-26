import { View } from 'react-native';

import { Button, Sheet, Text } from '@/components';
import { t } from '@/i18n';

export type ProfileInfo = 'notifications' | 'rate' | 'faq' | 'weightGoal' | null;

const FAQ = [1, 2, 3, 4, 5] as const;

/** Help & FAQ, and short explanations for settings that arrive later. */
export function ProfileInfoSheet({ info, onClose }: { info: ProfileInfo; onClose: () => void }) {
  const text: Record<Exclude<ProfileInfo, null | 'faq'>, [string, string]> = {
    notifications: [t('profile.notifications'), t('profile.notificationsSoon')],
    rate: [t('profile.rate'), t('profile.rateSoon')],
    weightGoal: [t('profile.weightGoal'), t('profile.weightGoalNote')],
  };
  return (
    <Sheet
      visible={info !== null}
      onClose={onClose}
      title={info === 'faq' ? t('profile.help') : info ? text[info][0] : undefined}
    >
      <View className="gap-4 pb-2">
        {info === 'faq' ? (
          FAQ.map((n) => (
            <View key={n} className="gap-1">
              <Text variant="label" className="font-bold">
                {t(`profile.faq${n}q`)}
              </Text>
              <Text tone="muted" className="text-[14px] leading-5">
                {t(`profile.faq${n}a`)}
              </Text>
            </View>
          ))
        ) : info ? (
          <Text>{text[info][1]}</Text>
        ) : null}
        <Button label={t('common.close')} variant="ghost" onPress={onClose} />
      </View>
    </Sheet>
  );
}
