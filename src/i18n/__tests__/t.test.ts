import { t } from '..';

describe('t', () => {
  it('looks up nested keys', () => {
    expect(t('common.appName')).toBe('DietBuddy');
  });

  it('fills placeholders', () => {
    expect(t('a11y.progress', { label: 'Calories', value: 1200, max: 1800 })).toBe(
      'Calories: 1200 of 1800',
    );
  });

  it('leaves unknown placeholders in place', () => {
    expect(t('a11y.progress', { label: 'Water' })).toBe('Water: {{value}} of {{max}}');
  });
});
