import { t, type StringKey } from '@/i18n';

/** Label for an option key, or null when there is none (e.g. free-text "other"). */
function label(section: string, key: string): string | null {
  const k = `${section}.${key}` as StringKey;
  const text = t(k);
  return text === k ? null : text;
}

/** Turns a dietRules reason (e.g. "allergy:peanuts") into a warning for the user. */
export function photoWarningText(reason: string): string {
  const [kind, key = ''] = reason.split(':');
  switch (kind) {
    case 'allergy': {
      const what = key === 'other' ? null : label('onboardingAllergies', key);
      return what
        ? t('foodPhoto.warningAllergy', { what: what.toLowerCase() })
        : t('foodPhoto.warningAllergyOther');
    }
    case 'restriction':
      if (key === 'kosher_mixing') return t('foodPhoto.warningKosher');
      {
        const what = key === 'other' ? null : label('onboardingOptions', key);
        return what
          ? t('foodPhoto.warningRestriction', { what })
          : t('foodPhoto.warningRestrictionOther');
      }
    case 'diet':
      return t('foodPhoto.warningDiet', { what: label('onboardingOptions', key) ?? key });
    case 'avoid':
      return t('foodPhoto.warningAvoid', {
        what: (label('onboardingFoods', key) ?? key.replace(/_/g, ' ')).toLowerCase(),
      });
    default:
      return t('foodPhoto.warningOther');
  }
}
