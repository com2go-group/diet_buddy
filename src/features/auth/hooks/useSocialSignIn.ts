import { useEffect, useState } from 'react';

import type { StringKey } from '@/i18n';

import { isGoogleAvailable } from '../config';
import { AuthFailure } from '../errors';
import { isAppleAvailable, signInWithApple, signInWithGoogle } from '../social';

/** Availability, busy state and errors for the Apple and Google buttons. */
export function useSocialSignIn() {
  const [apple, setApple] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<StringKey | undefined>();

  useEffect(() => {
    let active = true;
    isAppleAvailable().then((available) => active && setApple(available));
    return () => {
      active = false;
    };
  }, []);

  const run = (fn: () => Promise<void>) => async () => {
    setBusy(true);
    setError(undefined);
    try {
      await fn();
    } catch (e) {
      const failure = e instanceof AuthFailure ? e : new AuthFailure('authErrors.socialFailed');
      if (failure.code !== 'cancelled') setError(failure.messageKey);
    } finally {
      setBusy(false);
    }
  };

  return {
    apple,
    google: isGoogleAvailable(),
    busy,
    error,
    onApple: run(signInWithApple),
    onGoogle: run(signInWithGoogle),
  };
}
