import { isAuthApiError, isAuthRetryableFetchError, type AuthError } from '@supabase/supabase-js';

import type { StringKey } from '@/i18n';

/** Thrown by the auth API wrappers with a translatable message key. */
export class AuthFailure extends Error {
  constructor(
    public readonly messageKey: StringKey,
    public readonly code?: string,
  ) {
    super(messageKey);
    this.name = 'AuthFailure';
  }
}

const byCode: Record<string, StringKey> = {
  invalid_credentials: 'authErrors.invalidCredentials',
  user_already_exists: 'authErrors.alreadyRegistered',
  email_exists: 'authErrors.alreadyRegistered',
  phone_exists: 'authErrors.alreadyRegistered',
  weak_password: 'authErrors.weakPassword',
  otp_expired: 'authErrors.codeExpired',
  otp_disabled: 'authErrors.notConfigured',
  over_email_send_rate_limit: 'authErrors.rateLimited',
  over_sms_send_rate_limit: 'authErrors.rateLimited',
  over_request_rate_limit: 'authErrors.rateLimited',
  sms_send_failed: 'authErrors.smsFailed',
  phone_provider_disabled: 'authErrors.notConfigured',
  email_provider_disabled: 'authErrors.notConfigured',
  provider_disabled: 'authErrors.notConfigured',
  validation_failed: 'authErrors.unknown',
};

/**
 * Maps a Supabase auth error to a user-facing message key. Codes that need a different flow
 * (email_not_confirmed, phone_not_confirmed) are handled by the caller before this is used.
 */
export function authErrorKey(error: AuthError): StringKey {
  if (isAuthRetryableFetchError(error)) return 'authErrors.network';
  if (isAuthApiError(error) && error.code && error.code in byCode) {
    return byCode[error.code] as StringKey;
  }
  // The database's age gate aborts user creation; Supabase reports it as a generic
  // "Database error saving new user". The form checks age first, so this is a fallback.
  if (/database error saving new user/i.test(error.message)) return 'authErrors.underage';
  return 'authErrors.unknown';
}

export function toAuthFailure(error: AuthError): AuthFailure {
  return new AuthFailure(authErrorKey(error), error.code);
}
