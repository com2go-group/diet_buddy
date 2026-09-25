/**
 * Placeholder signed-in screen until onboarding (Phase 1 item 6) and the tabs (item 8) exist.
 */
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Screen, Text } from '@/components';
import { signOut, useSessionStore } from '@/features/auth';
import { t } from '@/i18n';

export default function Home() {
  const user = useSessionStore((s) => s.session?.user);
  const [busy, setBusy] = useState(false);
  return (
    <Screen contentClassName="gap-4 pt-10">
      <Text variant="title" accessibilityRole="header">
        {t('home.signedInTitle')}
      </Text>
      <Card className="gap-1">
        <Text tone="muted">{t('home.signedInAs')}</Text>
        <Text variant="heading">{user?.email || user?.phone || ''}</Text>
      </Card>
      <Text tone="muted">{t('home.comingSoon')}</Text>
      <View className="mt-4">
        <Button
          variant="outline"
          label={t('auth.signOut')}
          loading={busy}
          onPress={async () => {
            setBusy(true);
            await signOut().finally(() => setBusy(false));
          }}
        />
      </View>
    </Screen>
  );
}
