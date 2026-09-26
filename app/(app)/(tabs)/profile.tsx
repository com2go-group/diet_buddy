import { useState } from 'react';

import { Button } from '@/components';
import { signOut } from '@/features/auth';
import { ComingNext } from '@/features/tabs';
import { t } from '@/i18n';

export default function ProfileTab() {
  const [busy, setBusy] = useState(false);
  return (
    <ComingNext title="tabs.profile" description="tabs.profileSoon" emoji="👤">
      <Button
        variant="outline"
        label={t('auth.signOut')}
        loading={busy}
        onPress={async () => {
          setBusy(true);
          await signOut().finally(() => setBusy(false));
        }}
      />
    </ComingNext>
  );
}
