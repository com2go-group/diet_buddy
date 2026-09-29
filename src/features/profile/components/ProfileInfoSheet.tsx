import { View } from 'react-native';

import { Button, Sheet, Text } from '@/components';
import { t } from '@/i18n';

export type ProfileInfo = 'rate' | null;

/** Short explanations for settings that arrive later. */
export function ProfileInfoSheet({ info, onClose }: { info: ProfileInfo; onClose: () => void }) {
  const text: Record<Exclude<ProfileInfo, null>, [string, string]> = {
    rate: [t('profile.rate'), t('profile.rateSoon')],
  };
  return (
    <Sheet visible={info !== null} onClose={onClose} title={info ? text[info][0] : undefined}>
      <View className="gap-4 pb-2">
        {info ? <Text>{text[info][1]}</Text> : null}
        <Button label={t('common.close')} variant="ghost" onPress={onClose} />
      </View>
    </Sheet>
  );
}
