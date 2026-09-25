import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

import {
  requestPasswordReset,
  resendCode,
  signIn,
  signUp,
  updatePassword,
  verifyCode,
} from '../api';
import { authErrorKey } from '../errors';
import { useSessionStore } from '../sessionStore';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      verifyOtp: jest.fn(),
      resend: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      signInWithOtp: jest.fn(),
      updateUser: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
  },
}));

const auth = supabase.auth as unknown as Record<string, jest.Mock>;
const apiError = (code: string, message = code, status = 400) =>
  new AuthApiError(message, status, code);

beforeEach(() => {
  jest.clearAllMocks();
  useSessionStore.setState({ recovering: false });
});

describe('signUp', () => {
  const input = {
    method: 'email' as const,
    identifier: 'alex@example.com',
    password: 'diet2buddy',
    name: 'Alex',
    birthDate: '1990-05-17',
  };

  it('sends name and birth date as metadata and returns the pending code', async () => {
    auth.signUp!.mockResolvedValue({ data: { user: { identities: [{}] } }, error: null });
    await expect(signUp(input)).resolves.toEqual({
      method: 'email',
      identifier: 'alex@example.com',
      purpose: 'signup',
    });
    expect(auth.signUp).toHaveBeenCalledWith({
      email: 'alex@example.com',
      password: 'diet2buddy',
      options: { data: { name: 'Alex', birth_date: '1990-05-17' } },
    });
  });

  it('uses the phone field for phone sign-up', async () => {
    auth.signUp!.mockResolvedValue({ data: { user: { identities: [{}] } }, error: null });
    await signUp({ ...input, method: 'phone', identifier: '+447700900123' });
    expect(auth.signUp).toHaveBeenCalledWith(expect.objectContaining({ phone: '+447700900123' }));
  });

  it('detects an existing account hidden behind an empty identities list', async () => {
    auth.signUp!.mockResolvedValue({ data: { user: { identities: [] } }, error: null });
    await expect(signUp(input)).rejects.toMatchObject({
      messageKey: 'authErrors.alreadyRegistered',
    });
  });

  it('maps a rejected under-18 sign-up to the age message', async () => {
    auth.signUp!.mockResolvedValue({
      data: { user: null },
      error: apiError('unexpected_failure', 'Database error saving new user', 500),
    });
    await expect(signUp(input)).rejects.toMatchObject({ messageKey: 'authErrors.underage' });
  });
});

describe('signIn', () => {
  it('returns null on success', async () => {
    auth.signInWithPassword!.mockResolvedValue({ error: null });
    await expect(signIn('email', 'a@b.co', 'pw')).resolves.toBeNull();
  });

  it('resends a code and returns a pending verification for unconfirmed accounts', async () => {
    auth.signInWithPassword!.mockResolvedValue({ error: apiError('email_not_confirmed') });
    auth.resend!.mockResolvedValue({ error: null });
    await expect(signIn('email', 'a@b.co', 'pw')).resolves.toEqual({
      method: 'email',
      identifier: 'a@b.co',
      purpose: 'signup',
    });
    expect(auth.resend).toHaveBeenCalledWith({ type: 'signup', email: 'a@b.co' });
  });

  it('resends by SMS for unconfirmed phone accounts', async () => {
    auth.signInWithPassword!.mockResolvedValue({ error: apiError('phone_not_confirmed') });
    auth.resend!.mockResolvedValue({ error: null });
    await signIn('phone', '+447700900123', 'pw');
    expect(auth.resend).toHaveBeenCalledWith({ type: 'sms', phone: '+447700900123' });
  });

  it('throws a friendly message for wrong credentials', async () => {
    auth.signInWithPassword!.mockResolvedValue({ error: apiError('invalid_credentials') });
    await expect(signIn('email', 'a@b.co', 'pw')).rejects.toMatchObject({
      messageKey: 'authErrors.invalidCredentials',
    });
  });
});

describe('verifyCode', () => {
  it('uses the right OTP type for each case', async () => {
    auth.verifyOtp!.mockResolvedValue({ error: null });
    await verifyCode({ method: 'email', identifier: 'a@b.co', purpose: 'signup' }, '123456');
    await verifyCode({ method: 'email', identifier: 'a@b.co', purpose: 'recovery' }, '123456');
    await verifyCode({ method: 'phone', identifier: '+447700900123', purpose: 'signup' }, '123456');
    expect(auth.verifyOtp!.mock.calls.map(([arg]) => arg)).toEqual([
      { email: 'a@b.co', token: '123456', type: 'email' },
      { email: 'a@b.co', token: '123456', type: 'recovery' },
      { phone: '+447700900123', token: '123456', type: 'sms' },
    ]);
  });

  it('enters recovery mode before a reset code signs the user in', async () => {
    auth.verifyOtp!.mockImplementation(async () => {
      expect(useSessionStore.getState().recovering).toBe(true);
      return { error: null };
    });
    await verifyCode({ method: 'email', identifier: 'a@b.co', purpose: 'recovery' }, '123456');
    expect(useSessionStore.getState().recovering).toBe(true);
  });

  it('leaves recovery mode if the reset code is wrong', async () => {
    auth.verifyOtp!.mockResolvedValue({ error: apiError('otp_expired') });
    await expect(
      verifyCode({ method: 'email', identifier: 'a@b.co', purpose: 'recovery' }, '000000'),
    ).rejects.toMatchObject({ messageKey: 'authErrors.codeExpired' });
    expect(useSessionStore.getState().recovering).toBe(false);
  });
});

describe('password reset', () => {
  it('emails a recovery code', async () => {
    auth.resetPasswordForEmail!.mockResolvedValue({ error: null });
    await expect(requestPasswordReset('email', 'a@b.co')).resolves.toMatchObject({
      purpose: 'recovery',
    });
  });

  it('texts a sign-in code for phone accounts without creating users', async () => {
    auth.signInWithOtp!.mockResolvedValue({ error: null });
    await requestPasswordReset('phone', '+447700900123');
    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      phone: '+447700900123',
      options: { shouldCreateUser: false },
    });
  });

  it('resending a recovery code requests a new reset', async () => {
    auth.resetPasswordForEmail!.mockResolvedValue({ error: null });
    await resendCode({ method: 'email', identifier: 'a@b.co', purpose: 'recovery' });
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('a@b.co');
  });

  it('saving the new password ends recovery mode', async () => {
    useSessionStore.setState({ recovering: true });
    auth.updateUser!.mockResolvedValue({ error: null });
    await updatePassword('diet2buddy');
    expect(useSessionStore.getState().recovering).toBe(false);
  });
});

describe('authErrorKey', () => {
  it.each([
    ['over_email_send_rate_limit', 'authErrors.rateLimited'],
    ['over_sms_send_rate_limit', 'authErrors.rateLimited'],
    ['user_already_exists', 'authErrors.alreadyRegistered'],
    ['sms_send_failed', 'authErrors.smsFailed'],
    ['phone_provider_disabled', 'authErrors.notConfigured'],
    ['something_new', 'authErrors.unknown'],
  ])('%s → %s', (code, key) => {
    expect(authErrorKey(apiError(code))).toBe(key);
  });

  it('reports network failures', () => {
    expect(authErrorKey(new AuthRetryableFetchError('Failed to fetch', 0))).toBe(
      'authErrors.network',
    );
  });
});
