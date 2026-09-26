import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Image, View } from 'react-native';

import { Button, Card, SkeletonCard, Text, TextField } from '@/components';
import { t } from '@/i18n';

import { FormMessage } from '../auth/components/FormMessage';
import { enrollTotp, mfaState, verifyTotp } from './api';

/** Sets up (first time) or asks for the authenticator code, then upgrades the session to aal2. */
export function MfaPanel() {
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const state = useQuery({ queryKey: ['mfaState'], queryFn: mfaState, staleTime: Infinity });
  const enroll = useQuery({
    queryKey: ['mfaEnroll'],
    enabled: state.data?.verified === false,
    queryFn: enrollTotp,
    staleTime: Infinity,
    gcTime: 0,
  });
  const verify = useMutation({
    mutationFn: () => {
      const factorId = state.data?.factorId ?? enroll.data?.factorId;
      if (!factorId) throw new Error('no factor');
      return verifyTotp(factorId, code.trim());
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });

  if (state.isPending || (state.data?.verified === false && enroll.isPending)) {
    return <SkeletonCard lines={4} />;
  }
  const setup = state.data?.verified === false ? enroll.data : null;
  return (
    <Card className="max-w-md gap-4 self-center">
      <Text variant="heading" accessibilityRole="header">
        🔐 {t('admin.mfaTitle')}
      </Text>
      <Text tone="muted">{setup ? t('admin.mfaSetupIntro') : t('admin.mfaVerifyIntro')}</Text>
      {setup ? (
        <View className="items-center gap-2">
          <View className="rounded-xl bg-white p-2">
            <Image
              source={{ uri: setup.qr }}
              accessibilityLabel={t('admin.mfaTitle')}
              style={{ width: 180, height: 180 }}
            />
          </View>
          <Text variant="caption" tone="muted" selectable>
            {t('admin.mfaSecret', { secret: setup.secret })}
          </Text>
        </View>
      ) : null}
      <TextField
        label={t('admin.mfaCode')}
        value={code}
        onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        onSubmitEditing={() => code.length === 6 && verify.mutate()}
      />
      <FormMessage message={verify.isError || enroll.isError ? t('admin.mfaFailed') : undefined} />
      <Button
        label={t('admin.mfaVerify')}
        disabled={code.length !== 6}
        loading={verify.isPending}
        onPress={() => verify.mutate()}
      />
    </Card>
  );
}
