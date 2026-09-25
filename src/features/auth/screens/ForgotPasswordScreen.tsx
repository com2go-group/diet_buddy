import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Screen, SegmentedControl, Text } from '@/components';
import { t } from '@/i18n';

import { requestPasswordReset } from '../api';
import { FormMessage } from '../components/FormMessage';
import { IdentifierField } from '../components/IdentifierField';
import { authConfig } from '../config';
import { useAuthForm } from '../hooks/useAuthForm';
import { forgotPasswordSchema, identifierOf, type AuthMethod } from '../schemas';

export function ForgotPasswordScreen() {
  const [method, setMethod] = useState<AuthMethod>('email');
  const { form, submit, formError, fieldError } = useAuthForm(forgotPasswordSchema, {
    defaultValues: { method, email: '', phone: '' },
    values: { method, email: '', phone: '' },
    resetOptions: { keepDirtyValues: true },
  });

  const onSubmit = submit(async (values) => {
    const pending = await requestPasswordReset(values.method, identifierOf(values));
    router.push({ pathname: '/verify', params: { ...pending } });
  });

  return (
    <Screen edges={['top', 'bottom']} contentClassName="gap-5 pt-10">
      <View className="gap-1">
        <Text variant="title" accessibilityRole="header">
          {t('auth.forgotTitle')}
        </Text>
        <Text tone="muted">{t('auth.forgotSubtitle')}</Text>
      </View>
      {authConfig.phoneEnabled ? (
        <SegmentedControl
          accessibilityLabel={`${t('auth.methodEmail')} / ${t('auth.methodPhone')}`}
          value={method}
          onChange={setMethod}
          options={[
            { value: 'email', label: t('auth.methodEmail') },
            { value: 'phone', label: t('auth.methodPhone') },
          ]}
        />
      ) : null}
      <IdentifierField control={form.control} method={method} error={fieldError(method)} />
      <FormMessage message={formError} />
      <Button label={t('auth.sendCode')} onPress={onSubmit} loading={form.formState.isSubmitting} />
      <Button variant="ghost" label={t('auth.back')} onPress={() => router.back()} />
    </Screen>
  );
}
