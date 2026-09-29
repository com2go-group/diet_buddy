import { dictionaries, getLanguage, keysOf, LANGUAGES, lookup, setLanguage, t } from '..';
import { en } from '../en';

/** Keys that stay as in English: brands, units, symbols and number formats. */
const SAME_AS_ENGLISH =
  /^(common\.appName|auth\.continueWith(Apple|Google)|auth\.emailPlaceholder|units\..*|onboarding\.stepCounter|checkIn\.step|onboardingDevices\.(?!.*Desc$).*|healthApps\.(healthkit|health_connect)|coach\.(aria|max|luna)|coachTip\.\w+Title|story\.brand|paywall\.(appStore|googlePlay)|homeScreen\.noScore|progress\.none|bodyScan\.nameAge|onboardingOptions\.customSub|initialPlan\.(first_kg|halfway))$/;

const placeholders = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort();
// The staff-only admin pages are English only.
const userKeys = keysOf(en).filter((k) => !k.startsWith('admin.'));

describe.each(LANGUAGES.filter((l) => l !== 'en'))('%s translation', (language) => {
  const dictionary = dictionaries[language];

  it('covers every screen string', () => {
    const missing = userKeys.filter(
      (k) => lookup(dictionary, k) === undefined && !SAME_AS_ENGLISH.test(k),
    );
    expect(missing).toEqual([]);
  });

  it('keeps every placeholder', () => {
    const broken = userKeys.filter((k) => {
      const value = lookup(dictionary, k);
      return (
        value !== undefined && placeholders(value).join() !== placeholders(lookup(en, k)!).join()
      );
    });
    expect(broken).toEqual([]);
  });

  it('has no keys English doesn’t have', () => {
    const all = new Set(keysOf(en));
    expect(keysOf(dictionary).filter((k) => !all.has(k))).toEqual([]);
  });
});

describe('switching language', () => {
  const before = getLanguage();
  afterEach(() => setLanguage(before));

  it('uses the chosen language and falls back to English', () => {
    setLanguage('de');
    expect(t('tabs.meals')).toBe('Mahlzeiten');
    expect(t('common.appName')).toBe('DietBuddy');
    expect(t('admin.mfaTitle' as never)).toBe(lookup(en, 'admin.mfaTitle'));
  });
});
