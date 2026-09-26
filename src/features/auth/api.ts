import { pushToken, scheduleReminders } from '@/lib/push';
import { supabase } from '@/lib/supabase';

import { AuthFailure, toAuthFailure } from './errors';
import type { AuthMethod } from './schemas';
import { useSessionStore } from './sessionStore';

/** Where a code was sent and what it's for. */
export interface PendingVerification {
  method: AuthMethod;
  identifier: string;
  purpose: 'signup' | 'recovery';
}

const credentials = (method: AuthMethod, identifier: string, password: string) =>
  method === 'email' ? { email: identifier, password } : { phone: identifier, password };

export async function signUp(input: {
  method: AuthMethod;
  identifier: string;
  password: string;
  name: string;
  birthDate: string;
}): Promise<PendingVerification> {
  const { data, error } = await supabase.auth.signUp({
    ...credentials(input.method, input.identifier, input.password),
    // Copied into the profile by the handle_new_user trigger; birth_date passes the 18+ gate.
    options: { data: { name: input.name, birth_date: input.birthDate } },
  });
  if (error) throw toAuthFailure(error);
  // With confirmations on, Supabase hides whether the address was already registered and returns
  // a user with no identities instead.
  if (data.user && data.user.identities?.length === 0) {
    throw new AuthFailure('authErrors.alreadyRegistered', 'user_already_exists');
  }
  return { method: input.method, identifier: input.identifier, purpose: 'signup' };
}

/**
 * Signs in with a password. If the account was never verified, sends a fresh code and returns
 * the pending verification so the caller can show the code screen.
 */
export async function signIn(
  method: AuthMethod,
  identifier: string,
  password: string,
): Promise<PendingVerification | null> {
  const { error } = await supabase.auth.signInWithPassword(
    credentials(method, identifier, password),
  );
  if (!error) return null;
  if (error.code === 'email_not_confirmed' || error.code === 'phone_not_confirmed') {
    await resendCode({ method, identifier, purpose: 'signup' });
    return { method, identifier, purpose: 'signup' };
  }
  throw toAuthFailure(error);
}

export async function verifyCode(pending: PendingVerification, code: string): Promise<void> {
  const { setRecovering } = useSessionStore.getState();
  // Set before verifying: the code signs the user in, and routing must go to the new-password
  // screen rather than into the app.
  if (pending.purpose === 'recovery') setRecovering(true);
  const { error } =
    pending.method === 'email'
      ? await supabase.auth.verifyOtp({
          email: pending.identifier,
          token: code,
          type: pending.purpose === 'recovery' ? 'recovery' : 'email',
        })
      : await supabase.auth.verifyOtp({ phone: pending.identifier, token: code, type: 'sms' });
  if (error) {
    if (pending.purpose === 'recovery') setRecovering(false);
    throw toAuthFailure(error);
  }
}

export async function resendCode(pending: PendingVerification): Promise<void> {
  if (pending.purpose === 'recovery') {
    await requestPasswordReset(pending.method, pending.identifier);
    return;
  }
  const { error } =
    pending.method === 'email'
      ? await supabase.auth.resend({ type: 'signup', email: pending.identifier })
      : await supabase.auth.resend({ type: 'sms', phone: pending.identifier });
  if (error) throw toAuthFailure(error);
}

/** Sends a reset code. Email uses the recovery template; phone signs in with an SMS code. */
export async function requestPasswordReset(
  method: AuthMethod,
  identifier: string,
): Promise<PendingVerification> {
  const { error } =
    method === 'email'
      ? await supabase.auth.resetPasswordForEmail(identifier)
      : await supabase.auth.signInWithOtp({
          phone: identifier,
          options: { shouldCreateUser: false },
        });
  if (error) throw toAuthFailure(error);
  return { method, identifier, purpose: 'recovery' };
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw toAuthFailure(error);
  useSessionStore.getState().setRecovering(false);
}

export async function signOut(): Promise<void> {
  // This device should stop receiving the account's pushes and reminders.
  const token = pushToken();
  if (token)
    await supabase
      .from('push_tokens')
      .delete()
      .eq('token', token)
      .then(undefined, () => undefined);
  await scheduleReminders([], () => ({ title: '', body: '' })).catch(() => undefined);
  const { error } = await supabase.auth.signOut();
  if (error) throw toAuthFailure(error);
}
