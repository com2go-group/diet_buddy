import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

import { authConfig } from './config';
import { AuthFailure, toAuthFailure } from './errors';

export async function isAppleAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync().catch(() => false);
}

/**
 * Native Sign in with Apple → Supabase ID-token sign-in. Apple only returns the user's name on the
 * first authorization, so it is saved to the profile straight away.
 */
export async function signInWithApple(): Promise<void> {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (error) {
    if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') {
      throw new AuthFailure('authErrors.socialCancelled', 'cancelled');
    }
    throw new AuthFailure('authErrors.socialFailed');
  }
  if (!credential.identityToken) throw new AuthFailure('authErrors.socialFailed');

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw toAuthFailure(error);

  const name = [credential.fullName?.givenName, credential.fullName?.familyName]
    .filter(Boolean)
    .join(' ');
  if (name && data.user) {
    await supabase.from('profiles').update({ name }).eq('user_id', data.user.id).is('name', null);
  }
}

/** Native Google Sign-In → Supabase ID-token sign-in. Loaded lazily: it needs a dev build. */
export async function signInWithGoogle(): Promise<void> {
  const { GoogleSignin, isCancelledResponse, isErrorWithCode, statusCodes } =
    await import('@react-native-google-signin/google-signin');
  GoogleSignin.configure({
    webClientId: authConfig.google.webClientId,
    iosClientId: authConfig.google.iosClientId,
  });
  let idToken: string | null = null;
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    if (isCancelledResponse(response)) {
      throw new AuthFailure('authErrors.socialCancelled', 'cancelled');
    }
    idToken = response.data.idToken;
  } catch (error) {
    if (error instanceof AuthFailure) throw error;
    if (isErrorWithCode(error) && error.code === statusCodes.IN_PROGRESS) {
      throw new AuthFailure('authErrors.socialCancelled', 'cancelled');
    }
    throw new AuthFailure('authErrors.socialFailed');
  }
  if (!idToken) throw new AuthFailure('authErrors.socialFailed');

  const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
  if (error) throw toAuthFailure(error);
}
