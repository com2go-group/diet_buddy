import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Chip, Text, TextField } from '@/components';
import { t } from '@/i18n';

import { FormMessage } from '../../auth/components/FormMessage';
import {
  AdminError,
  GRANT_DURATIONS,
  setPremium,
  type AdminUserDetail,
  type GrantDuration,
} from '../api';
import { errorText, formatDateTime } from './common';

function failure(e: unknown): string {
  if (e instanceof AdminError && e.message === 'not_configured') {
    return t('admin.premiumNotConfigured');
  }
  if (e instanceof AdminError && e.message === 'store_unavailable') {
    return t('admin.premiumStoreUnavailable');
  }
  return errorText(e);
}

/**
 * Premium given by an admin (admins and owners): a RevenueCat promotional entitlement for a
 * chosen time, with a reason for the audit log, and the user's grant history.
 */
export function PremiumCard({ user, canAct }: { user: AdminUserDetail; canAct: boolean }) {
  const queryClient = useQueryClient();
  const [duration, setDuration] = useState<GrantDuration>('monthly');
  const [reason, setReason] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const change = useMutation({
    mutationFn: (grant: boolean) =>
      setPremium(user.user_id, grant ? { duration } : null, reason.trim()),
    onSuccess: (result, grant) => {
      setReason('');
      setDone(
        grant
          ? result.expiresAt
            ? t('admin.premiumGranted', { date: formatDateTime(result.expiresAt) })
            : t('admin.premiumGrantedLifetime')
          : result.premium
            ? t('admin.premiumStillActive')
            : t('admin.premiumRevoked'),
      );
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });
  const grants = user.premium_grants ?? [];
  const reasonOk = reason.trim().length >= 3;

  return (
    <Card className="gap-3">
      <Text variant="label">{t('admin.premiumTitle')}</Text>
      <Text>{user.is_premium ? t('admin.premiumStatusOn') : t('admin.premiumStatusOff')}</Text>
      {canAct ? (
        <>
          <Text tone="muted">{t('admin.premiumNote')}</Text>
          <Text variant="label">{t('admin.premiumDuration')}</Text>
          <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
            {GRANT_DURATIONS.map((d) => (
              <Chip
                key={d}
                label={t(`admin.premium_${d}`)}
                selected={duration === d}
                selectionRole="radio"
                onPress={() => setDuration(d)}
              />
            ))}
          </View>
          <TextField
            label={t('admin.premiumReason')}
            value={reason}
            onChangeText={setReason}
            maxLength={200}
          />
          <Button
            label={t('admin.premiumGrant')}
            disabled={!reasonOk}
            loading={change.isPending && change.variables === true}
            onPress={() => change.mutate(true)}
          />
          <Button
            label={t('admin.premiumRevoke')}
            variant="outline"
            disabled={!reasonOk}
            loading={change.isPending && change.variables === false}
            onPress={() => change.mutate(false)}
          />
          <FormMessage message={change.isError ? failure(change.error) : undefined} />
          {done ? <Text accessibilityLiveRegion="polite">✓ {done}</Text> : null}
        </>
      ) : null}
      {grants.length ? (
        <>
          <Text variant="label">{t('admin.premiumHistory')}</Text>
          {grants.map((g) => (
            <Text key={`${g.created_at}-${g.action}`} tone="muted">
              {g.action === 'grant_premium'
                ? t('admin.premiumHistoryGrant', {
                    date: formatDateTime(g.created_at),
                    duration: g.details.duration ? t(`admin.premium_${g.details.duration}`) : '?',
                    admin: g.admin_email ?? '?',
                    reason: g.details.reason ?? '',
                  })
                : t('admin.premiumHistoryRevoke', {
                    date: formatDateTime(g.created_at),
                    admin: g.admin_email ?? '?',
                    reason: g.details.reason ?? '',
                  })}
            </Text>
          ))}
        </>
      ) : null}
    </Card>
  );
}
