/**
 * All user-facing English copy. Screens read strings through t() so a localization
 * library can replace this module later without touching call sites.
 * Copy follows the prototype unless CLAUDE.md says otherwise.
 */
export const en = {
  common: {
    appName: 'DietBuddy',
    continue: 'Continue',
    back: 'Back',
    close: 'Close',
    cancel: 'Cancel',
    save: 'Save',
    retry: 'Try again',
    loading: 'Loading',
    notMedicalAdvice:
      'DietBuddy provides general wellness guidance, not medical advice. Talk to a healthcare professional before making major changes to your diet or exercise.',
  },
  errors: {
    genericTitle: 'Something went wrong',
    genericMessage: 'We couldn’t load this right now. Check your connection and try again.',
  },
  empty: {
    genericTitle: 'Nothing here yet',
  },
  units: {
    kcal: 'kcal',
    g: 'g',
    kg: 'kg',
    lb: 'lb',
    cm: 'cm',
    ml: 'ml',
    percent: '%',
  },
  macros: {
    protein: 'Protein',
    carbs: 'Carbs',
    fat: 'Fat',
    fiber: 'Fiber',
    calories: 'Calories',
  },
  a11y: {
    progress: '{{label}}: {{value}} of {{max}}',
  },
} as const;

export type Strings = typeof en;
