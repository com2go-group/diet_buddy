import { Controller } from 'react-hook-form';
import { View } from 'react-native';

import { Button, Screen, Text, TextField } from '@/components';
import { t } from '@/i18n';
import { haptics } from '@/lib/haptics';

import { updatePassword } from '../api';
import { FormMessage } from '../components/FormMessage';
import { useAuthForm } from '../hooks/useAuthForm';
import { newPasswordSchema } from '../schemas';

/** Shown after a reset code is accepted; saving clears the recovery state and enters the app. */
export function NewPasswordScreen() {
  const { form, submit, formError, fieldError } = useAuthForm(newPasswordSchema, {
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = submit(async (values) => {
    await updatePassword(values.password);
    haptics.success();
  });

  return (
    <Screen edges={['top', 'bottom']} contentClassName="gap-5 pt-10">
      <View className="gap-1">
        <Text variant="title" accessibilityRole="header">
          {t('auth.newPasswordTitle')}
        </Text>
        <Text tone="muted">{t('auth.newPasswordSubtitle')}</Text>
      </View>
      <Controller
        control={form.control}
        name="password"
        render={({ field }) => (
          <TextField
            label={t('auth.newPassword')}
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
        label={t('auth.savePassword')}
        onPress={onSubmit}
        loading={form.formState.isSubmitting}
      />
    </Screen>
  );
}
