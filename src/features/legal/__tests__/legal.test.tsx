import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Linking } from 'react-native';

import { renderScreen } from '@/test/render';

import { authConfig } from '../../auth/config';
import { fillPlaceholders, legalEntity, openLegal } from '../legal';
import { LegalScreen } from '../LegalScreen';
import { PRIVACY_POLICY } from '../privacy.en';
import { TERMS_OF_SERVICE } from '../terms.en';
import type { LegalDoc } from '../types';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
}));

const allText = (doc: LegalDoc) =>
  [...doc.intro, ...doc.sections.flatMap((s) => [s.heading, ...s.blocks])]
    .map((b) => (typeof b === 'string' ? b : b.list.join('\n')))
    .join('\n');

describe('legal texts', () => {
  it('fills the entity placeholders and shows visible gaps when unset', () => {
    expect(fillPlaceholders('{{company}} at {{email}}', { company: 'Acme', email: 'a@b.c' })).toBe(
      'Acme at a@b.c',
    );
    expect(fillPlaceholders('by {{company}}')).toBe(`by ${legalEntity.company}`);
    expect(legalEntity.company).toBe('[company name]');
  });

  it('uses only known placeholders', () => {
    for (const doc of [PRIVACY_POLICY, TERMS_OF_SERVICE]) {
      const keys = [...allText(doc).matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
      expect(keys.every((k) => k! in legalEntity)).toBe(true);
    }
  });

  it('names every processor and data recipient', () => {
    const policy = allText(PRIVACY_POLICY);
    const parties = ['Supabase', 'Anthropic', 'RevenueCat', 'AdMob', 'Expo', 'Brevo', 'sms.to'];
    for (const party of [...parties, 'USDA', 'Open Food Facts']) expect(policy).toContain(party);
  });

  it('covers the special-category consents and the 18+ rule', () => {
    const policy = allText(PRIVACY_POLICY);
    expect(policy).toMatch(/Art\. 9\(2\)\(a\)/);
    expect(policy).toMatch(/AI body scan/);
    expect(policy).toMatch(/Wellness insights from coach chats/);
    expect(policy).toMatch(/never used for advertising/);
    expect(allText(TERMS_OF_SERVICE)).toMatch(/18 or older/);
    expect(allText(TERMS_OF_SERVICE)).toMatch(/Not medical advice/);
  });
});

describe('openLegal', () => {
  afterEach(() => {
    authConfig.privacyUrl = undefined;
  });

  it('opens the page inside the app when no URL is configured', () => {
    openLegal('terms');
    expect(router.push).toHaveBeenCalledWith('/legal/terms');
  });

  it('opens the hosted page when configured', () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    authConfig.privacyUrl = 'https://example.com/privacy';
    openLegal('privacy');
    expect(open).toHaveBeenCalledWith('https://example.com/privacy');
  });
});

describe('LegalScreen', () => {
  it('renders the title, date, sections and filled placeholders', async () => {
    await renderScreen(<LegalScreen doc={PRIVACY_POLICY} />);
    expect(screen.getByRole('header', { name: 'Privacy Policy' })).toBeOnTheScreen();
    expect(screen.getByText('Last updated 28 September 2026')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: '10. Your rights' })).toBeOnTheScreen();
    expect(screen.getByText(/DietBuddy is provided by \[company name\]/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(router.back).toHaveBeenCalled();
  });
});
