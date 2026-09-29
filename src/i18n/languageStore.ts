import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { deviceLanguage, isLanguage, setLanguage, type Language } from '.';

export type LanguagePreference = 'system' | Language;

interface LanguageState {
  preference: LanguagePreference;
  /** The language in use (the preference, or the device's language for "system"). */
  language: Language;
  setPreference: (preference: LanguagePreference) => void;
}

const resolve = (preference: LanguagePreference): Language =>
  preference === 'system' ? deviceLanguage() : preference;

/** App language: follows the phone by default, overridable in Profile → Language. */
export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      preference: 'system',
      language: resolve('system'),
      setPreference: (preference) => {
        const language = resolve(preference);
        setLanguage(language);
        set({ preference, language });
      },
    }),
    {
      name: 'language-preference',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ preference: s.preference }),
      onRehydrateStorage: () => (state) => {
        const preference =
          state && (state.preference === 'system' || isLanguage(state.preference))
            ? state.preference
            : 'system';
        const language = resolve(preference);
        setLanguage(language);
        useLanguageStore.setState({ preference, language });
      },
    },
  ),
);
