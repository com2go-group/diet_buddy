import { router } from 'expo-router';
import { Controller } from 'react-hook-form';
import { View } from 'react-native';

import { Button, TextField } from '@/components';
import { t } from '@/i18n';

import { signUp } from '../api';
import { useAuthForm } from '../hooks/useAuthForm';
import { identifierOf, signUpSchema, type AuthMethod } from '../schemas';
import { BirthDateField } from './BirthDateField';
import { FormMessage } from './FormMessage';
import { IdentifierField } from './IdentifierField';
import { LegalNotice } from './LegalNotice';

const empty = {
  email: '',
  phone: '',
  name: '',
  birthDate: { day: '', month: '', year: '' },
  password: '',
  confirmPassword: '',
};

export function SignUpForm({ method }: { method: AuthMethod }) {
  const { form, submit, formError, fieldError } = useAuthForm(signUpSchema, {
    defaultValues: { method, ...empty },
    values: { method, ...empty },
    resetOptions: { keepDirtyValues: true },
  });

  const onSubmit = submit(async (values) => {
    const pending = await signUp({
      method: values.method,
      identifier: identifierOf(values),
      password: values.password,
      name: values.name,
      birthDate: values.birthDate,
    });
    router.push({ pathname: '/verify', params: { ...pending } });
  });

  return (
    <View className="gap-3">
      <Controller
        control={form.control}
        name="name"
        render={({ field }) => (
          <TextField
            label={t('auth.fullName')}
            placeholder={t('auth.fullNamePlaceholder')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldError('name')}
            autoComplete="name"
            textContentType="name"
            autoCapitalize="words"
          />
        )}
      />
      <IdentifierField control={form.control} method={method} error={fieldError(method)} />
      <Controller
        control={form.control}
        name="birthDate"
        render={({ field }) => (
          <BirthDateField
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={fieldError('birthDate')}
          />
        )}
      />
      <Controller
        control={form.control}
        name="password"
        render={({ field }) => (
          <TextField
            label={t('auth.password')}
            password
            hint={t('auth.passwordHint')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldError('password')}
            autoComplete="new-password"
            textContentType="newPassword"
          />
        )}
      />
      <Controller
        control={form.control}
        name="confirmPassword"
        render={({ field }) => (
          <TextField
            label={t('auth.confirmPassword')}
            password
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldError('confirmPassword')}
            autoComplete="new-password"
            textContentType="newPassword"
            onSubmitEditing={onSubmit}
          />
        )}
      />
      <FormMessage message={formError} />
      <Button
        label={t('auth.createAccount')}
        onPress={onSubmit}
        loading={form.formState.isSubmitting}
        className="mt-1"
      />
      <LegalNotice />
    </View>
  );
}
