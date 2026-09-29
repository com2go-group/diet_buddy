import { useEffect } from 'react';

import { useLanguageStore } from '@/i18n/languageStore';
import { supabase } from '@/lib/supabase';

import { useSessionStore } from '../auth/sessionStore';

/**
 * Keeps `profiles.language` in step with the app's language, so the nightly meal plans
 * (batch-meal-plans) are translated like the ones made in the app. Best effort: a failure only
 * means tomorrow's overnight plan may be in English.
 */
export function useLanguageSync(): void {
  const userId = useSessionStore((s) => s.session?.user.id);
  const language = useLanguageStore((s) => s.language);
  useEffect(() => {
    if (!userId) return;
    void supabase
      .from('profiles')
      .update({ language })
      .eq('user_id', userId)
      .or(`language.is.null,language.neq.${language}`)
      .then(
        () => undefined,
        () => undefined,
      );
  }, [userId, language]);
}
