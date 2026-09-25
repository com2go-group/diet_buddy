import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';

interface SessionState {
  session: Session | null;
  /** False until the stored session has been read at startup. */
  initialized: boolean;
  /**
   * True from the moment a password-reset code is submitted until the new password is saved.
   * The reset code signs the user in, and this keeps them on the new-password screen.
   */
  recovering: boolean;
  setRecovering: (recovering: boolean) => void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  session: null,
  initialized: false,
  recovering: false,
  setRecovering: (recovering) => set({ recovering }),
}));

/** Loads the stored session and follows auth changes. Call once at startup; returns an unsubscribe. */
export function startSessionListener(): () => void {
  supabase.auth
    .getSession()
    .then(({ data }) => useSessionStore.setState({ session: data.session, initialized: true }))
    .catch(() => useSessionStore.setState({ session: null, initialized: true }));

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    useSessionStore.setState({
      session,
      initialized: true,
      ...(event === 'PASSWORD_RECOVERY' ? { recovering: true } : null),
      ...(event === 'SIGNED_OUT' ? { recovering: false } : null),
    });
  });
  return () => data.subscription.unsubscribe();
}
