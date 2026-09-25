import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';

import { TextField } from '@/components';
import { t } from '@/i18n';

import type { AuthMethod } from '../schemas';

interface IdentifierFieldProps<T extends FieldValues, TOut extends FieldValues> {
  control: Control<T, unknown, TOut>;
  method: AuthMethod;
  error?: string;
}

/** Email or phone input depending on the chosen method, with the right keyboard and autofill. */
export function IdentifierField<T extends FieldValues, TOut extends FieldValues>({
  control,
  method,
  error,
}: IdentifierFieldProps<T, TOut>) {
  const isEmail = method === 'email';
  return (
    <Controller
      control={control}
      name={(isEmail ? 'email' : 'phone') as Path<T>}
      render={({ field }) => (
        <TextField
          key={method}
          label={isEmail ? t('auth.email') : t('auth.phone')}
          placeholder={isEmail ? t('auth.emailPlaceholder') : t('auth.phonePlaceholder')}
          hint={isEmail ? undefined : t('auth.phoneHint')}
          value={field.value}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={error}
          keyboardType={isEmail ? 'email-address' : 'phone-pad'}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={isEmail ? 'email' : 'tel'}
          textContentType={isEmail ? 'emailAddress' : 'telephoneNumber'}
        />
      )}
    />
  );
}
