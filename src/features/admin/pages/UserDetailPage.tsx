import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { Button, Card, Chip, Text, TextField } from '@/components';
import { t } from '@/i18n';

import { FormMessage } from '../../auth/components/FormMessage';
import { atLeast, loadUser, setRole, userAction, type AdminRole } from '../api';
import { useAdmin } from '../useAdmin';
import { PageTitle, QueryState, errorText, formatDateTime } from './common';

const ROLES: (AdminRole | null)[] = [null, 'support', 'admin', 'owner'];

function download(name: string, data: unknown) {
  if (Platform.OS !== 'web') return;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function UserDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useAdmin();
  const queryClient = useQueryClient();
  const user = useQuery({ queryKey: ['admin', 'user', id], queryFn: () => loadUser(id!) });
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin'] });
  const action = useMutation({
    mutationFn: async (a: 'export' | 'ban' | 'unban' | 'delete') => {
      const result = await userAction(a, id!, a === 'delete' ? confirm.trim() : undefined);
      if (a === 'export') download(`dietbuddy-export-${id}.json`, result.export);
      return a;
    },
    onSuccess: (a) => {
      setDone(a === 'delete' ? t('admin.userDeleted') : t('admin.saved'));
      if (a !== 'export') void refresh();
    },
  });
  const role = useMutation({
    mutationFn: (r: AdminRole | null) => setRole(id!, r),
    onSuccess: refresh,
  });
  const canAct = atLeast(me.data?.role, 'admin');

  return (
    <QueryState query={user}>
      {(u) =>
        !u ? (
          <Text>{done ?? t('admin.usersEmpty')}</Text>
        ) : (
          <>
            <PageTitle>{u.email ?? u.phone ?? u.user_id}</PageTitle>
            <Text tone="muted" selectable>
              {u.user_id}
            </Text>
            <Card className="gap-1">
              <Text>
                {[
                  u.name,
                  u.is_premium ? t('admin.userPremium') : null,
                  u.banned ? t('admin.userBanned') : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <Text tone="muted">
                {t('admin.userJoined', { date: formatDateTime(u.created_at) })}
              </Text>
              <Text tone="muted">
                {t('admin.userLastSeen', { date: formatDateTime(u.last_sign_in_at) })}
              </Text>
              <Text tone="muted">{`${u.xp ?? 0} XP · ${u.streak_days ?? 0}-day streak`}</Text>
            </Card>
            <Card className="gap-1">
              <Text variant="label">{t('admin.userCounts')}</Text>
              {Object.entries(u.counts).map(([k, v]) => (
                <Text key={k} tone="muted">{`${k.replace(/_/g, ' ')}: ${v}`}</Text>
              ))}
              <Text variant="label" className="mt-2">
                {t('admin.userConsents')}
              </Text>
              {Object.entries(u.consents).map(([k, v]) => (
                <Text key={k} tone="muted">{`${k.replace(/_/g, ' ')}: ${v ? '✓' : '✗'}`}</Text>
              ))}
              <Text variant="label" className="mt-2">
                {t('admin.userTickets')}
              </Text>
              {u.tickets.map((tk) => (
                <Text key={tk.id} tone="muted">{`${tk.subject} · ${tk.status}`}</Text>
              ))}
            </Card>
            {me.data?.role === 'owner' ? (
              <Card className="gap-2">
                <Text variant="label">{t('admin.userRole')}</Text>
                <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
                  {ROLES.map((r) => (
                    <Chip
                      key={r ?? 'none'}
                      label={r ? t(`admin.role_${r}`) : t('admin.userRoleNone')}
                      selected={u.admin_role === r}
                      selectionRole="radio"
                      onPress={() => role.mutate(r)}
                    />
                  ))}
                </View>
                <FormMessage message={role.isError ? errorText(role.error) : undefined} />
              </Card>
            ) : null}
            {canAct ? (
              <Card className="gap-3">
                <Text variant="label">{t('admin.userActions')}</Text>
                <Button
                  label={t('admin.userExport')}
                  variant="outline"
                  onPress={() => action.mutate('export')}
                />
                <Button
                  label={u.banned ? t('admin.userUnban') : t('admin.userBan')}
                  variant="outline"
                  onPress={() => action.mutate(u.banned ? 'unban' : 'ban')}
                />
                <TextField
                  label={t('admin.userDeleteConfirm')}
                  value={confirm}
                  onChangeText={setConfirm}
                  autoCapitalize="none"
                />
                <Button
                  label={t('admin.userDelete')}
                  variant="destructive"
                  disabled={confirm.trim() !== u.user_id}
                  loading={action.isPending && action.variables === 'delete'}
                  onPress={() => action.mutate('delete')}
                />
                <FormMessage message={action.isError ? errorText(action.error) : undefined} />
                {done ? <Text accessibilityLiveRegion="polite">✓ {done}</Text> : null}
              </Card>
            ) : null}
          </>
        )
      }
    </QueryState>
  );
}
