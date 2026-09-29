import { useEffect, useState } from 'react';

import { SwitchRow } from '@/components';
import { t } from '@/i18n';
import {
  crashReportingAvailable,
  crashReportsEnabled,
  setCrashReportsEnabled,
} from '@/lib/telemetry';

/** Anonymous crash reports (on by default, stored on this device); hidden when not configured. */
export function CrashReportsRow() {
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => {
    crashReportsEnabled().then(setOn);
  }, []);
  if (!crashReportingAvailable() || on === null) return null;
  return (
    <SwitchRow
      label={t('privacy.crashReports')}
      description={t('privacy.crashReportsDesc')}
      value={on}
      onChange={(v) => {
        setOn(v);
        setCrashReportsEnabled(v).catch(() => undefined);
      }}
    />
  );
}
