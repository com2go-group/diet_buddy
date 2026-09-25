import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, type FieldValues, type Resolver, type UseFormProps } from 'react-hook-form';
import type { z } from 'zod';

import { t, type StringKey } from '@/i18n';

import { AuthFailure } from '../errors';

/**
 * react-hook-form + zod, plus a submit wrapper that turns AuthFailure into a form-level message.
 * Field errors hold string keys; fieldError() translates them.
 */
export function useAuthForm<TIn extends FieldValues, TOut>(
  schema: z.ZodType<TOut, TIn>,
  options: Omit<UseFormProps<TIn, unknown, TOut>, 'resolver'>,
) {
  const form = useForm<TIn, unknown, TOut>({
    ...options,
    resolver: zodResolver(schema as never) as unknown as Resolver<TIn, unknown, TOut>,
    mode: 'onTouched',
  });
  const [formError, setFormError] = useState<string | undefined>();

  const submit = (action: (values: TOut) => Promise<void>) =>
    form.handleSubmit(async (values) => {
      setFormError(undefined);
      try {
        await action(values);
      } catch (e) {
        setFormError(t(e instanceof AuthFailure ? e.messageKey : 'authErrors.unknown'));
      }
    });

  const fieldError = (name: string): string | undefined => {
    const message = name
      .split('.')
      .reduce<unknown>(
        (node, key) => (node as Record<string, unknown> | undefined)?.[key],
        form.formState.errors,
      );
    const key = (message as { message?: string } | undefined)?.message;
    return key ? t(key as StringKey) : undefined;
  };

  return { form, submit, formError, setFormError, fieldError };
}
