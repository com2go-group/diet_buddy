import { Slot, router } from 'expo-router';
import { Platform, View } from 'react-native';

import { Button, Card, ErrorState, SkeletonCard, Text } from '@/components';
import { AdminShell, MfaPanel, useAdmin } from '@/features/admin';
import { t } from '@/i18n';

/** Admins only, web only, and only after two-factor sign-in (the database checks this too). */
export default function AdminLayout() {
  const me = useAdmin();

  const page = (content: React.ReactNode) => (
    <View className="flex-1 justify-center bg-background p-5">{content}</View>
  );
  if (Platform.OS !== 'web') return page(<Text className="text-center">{t('admin.webOnly')}</Text>);
  if (me.isPending) return page(<SkeletonCard lines={3} />);
  if (me.isError)
    return page(<ErrorState message={t('admin.loadFailed')} onRetry={() => me.refetch()} />);
  if (!me.data) {
    return page(
      <Card className="max-w-md gap-3 self-center">
        <Text>{t('admin.noAccess')}</Text>
        <Button
          label={t('admin.backToApp')}
          variant="outline"
          onPress={() => router.replace('/')}
        />
      </Card>,
    );
  }
  if (!me.data.mfaVerified) return page(<MfaPanel />);
  return (
    <AdminShell role={me.data.role}>
      <Slot />
    </AdminShell>
  );
}
