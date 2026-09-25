import { router } from 'expo-router';
import { Controller } from 'react-hook-form';
import { Pressable, View } from 'react-native';

import { Button, Text, TextField } from '@/components';
import { t } from '@/i18n';

import { signIn } from '../api';
import { useAuthForm } from '../hooks/useAuthForm';
import { identifierOf, signInSchema, type AuthMethod } from '../schemas';
import { FormMessage } from './FormMessage';
import { IdentifierField } from './IdentifierField';

export function SignInForm({ method }: { method: AuthMethod }) {
  const { form, submit, formError, fieldError } = useAuthForm(signInSchema, {
    defaultValues: { method, email: '', phone: '', password: '' },
    values: { method, email: '', phone: '', password: '' },
    resetOptions: { keepDirtyValues: true },
  });

  const onSubmit = submit(async (values) => {
    const pending = await signIn(values.method, identifierOf(values), values.password);
    // Signed in: the session listener moves the app on. Unverified: go enter the code.
    if (pending) router.push({ pathname: '/verify', params: { ...pending } });
  });

  return (
    <View className="gap-3">
      <IdentifierField control={form.control} method={method} error={fieldError(method)} />
      <Controller
        control={form.control}
        name="password"
        render={({ field }) => (
          <TextField
            label={t('auth.password')}
            password
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldError('password')}
            autoComplete="current-password"
            textContentType="password"
            onSubmitEditing={onSubmit}
            labelAction={
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push('/forgot-password')}
                hitSlop={12}
              >
                <Text variant="caption" tone="primary" className="font-semibold">
                  {t('auth.forgotPassword')}
                </Text>
              </Pressable>
            }
          />
        )}
      />
      <FormMessage message={formError} />
      <Button
        label={t('auth.signIn')}
        onPress={onSubmit}
        loading={form.formState.isSubmitting}
        className="mt-1"
      />
    </View>
  );
}
