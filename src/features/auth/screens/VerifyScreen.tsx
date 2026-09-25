import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, Screen, Text } from '@/components';
import { t } from '@/i18n';
import { haptics } from '@/lib/haptics';

import { resendCode, verifyCode, type PendingVerification } from '../api';
import { CodeField } from '../components/CodeField';
import { FormMessage } from '../components/FormMessage';
import { AuthFailure } from '../errors';
import { codeSchema } from '../schemas';

const RESEND_SECONDS = 60;

/** Masks the middle of an address so it can be shown back safely: a•••@example.com, +44•••23. */
export function maskIdentifier(method: 'email' | 'phone', identifier: string): string {
  if (method === 'email') {
    const [local = '', domain = ''] = identifier.split('@');
    return `${local.slice(0, 1)}•••@${domain}`;
  }
  return `${identifier.slice(0, 3)}•••${identifier.slice(-2)}`;
}

export function VerifyScreen() {
  const params = useLocalSearchParams<{ method?: string; identifier?: string; purpose?: string }>();
  const pending: PendingVerification = {
    method: params.method === 'phone' ? 'phone' : 'email',
    identifier: params.identifier ?? '',
    purpose: params.purpose === 'recovery' ? 'recovery' : 'signup',
  };
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string>();
  const [message, setMessage] = useState<{ text: string; tone: 'error' | 'info' }>();
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const fail = (e: unknown) =>
    setMessage({
      text: t(e instanceof AuthFailure ? e.messageKey : 'authErrors.unknown'),
      tone: 'error',
    });

  const onVerify = async () => {
    const parsed = codeSchema.safeParse(code);
    if (!parsed.success) {
      setCodeError(t('authErrors.invalidCode'));
      return;
    }
    setCodeError(undefined);
    setMessage(undefined);
    setBusy(true);
    try {
      await verifyCode(pending, parsed.data);
      haptics.success();
      // Now signed in: route guards move on to the app, or to the new-password screen.
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const onResend = async () => {
    setMessage(undefined);
    try {
      await resendCode(pending);
      setCooldown(RESEND_SECONDS);
      setMessage({ text: t('auth.resent'), tone: 'info' });
    } catch (e) {
      fail(e);
    }
  };

  const masked = maskIdentifier(pending.method, pending.identifier);
  return (
    <Screen edges={['top', 'bottom']} contentClassName="gap-5 pt-10">
      <View className="gap-1">
        <Text variant="title" accessibilityRole="header">
          {t('auth.verifyTitle')}
        </Text>
        <Text tone="muted">
          {pending.method === 'email'
            ? t('auth.verifyEmailSubtitle', { identifier: masked })
            : t('auth.verifyPhoneSubtitle', { identifier: masked })}
        </Text>
      </View>
      <CodeField
        value={code}
        onChange={(value) => {
          setCode(value);
          if (codeError) setCodeError(undefined);
        }}
        error={codeError}
      />
      <FormMessage message={message?.text} tone={message?.tone} />
      <Button
        label={t('auth.verify')}
        onPress={onVerify}
        loading={busy}
        disabled={code.length < 6}
      />
      <Button
        variant="ghost"
        label={cooldown > 0 ? t('auth.resendIn', { seconds: cooldown }) : t('auth.resend')}
        disabled={cooldown > 0}
        onPress={onResend}
      />
      <Button variant="ghost" label={t('auth.wrongDestination')} onPress={() => router.back()} />
    </Screen>
  );
}
