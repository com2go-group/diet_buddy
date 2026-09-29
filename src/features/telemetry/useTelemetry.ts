import { useEffect } from 'react';

import { resetAnalyticsId, setAnalyticsEnabled, track } from '@/lib/telemetry';

import { useSessionStore } from '../auth/sessionStore';
import { useConsents } from '../profile/useProfile';

/**
 * Analytics follow the user's `analytics` consent (Privacy & Data): on only while granted, off
 * immediately when withdrawn. Signing out starts a new anonymous ID.
 */
export function useTelemetry(): void {
  const userId = useSessionStore((s) => s.session?.user.id);
  const consents = useConsents().query.data;
  const granted = Boolean(consents?.find((c) => c.consent_type === 'analytics')?.granted);

  useEffect(() => {
    setAnalyticsEnabled(Boolean(userId) && granted);
    if (userId && granted) track('app_open');
  }, [userId, granted]);

  useEffect(() => {
    if (!userId) resetAnalyticsId();
  }, [userId]);
}
