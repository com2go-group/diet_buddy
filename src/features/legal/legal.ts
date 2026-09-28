import { router, type Href } from 'expo-router';
import { Linking } from 'react-native';

import { authConfig } from '../auth/config';
import type { LegalBlock } from './types';

export type LegalKind = 'privacy' | 'terms';

/** Legal entity details for the policies; unset values show a visible placeholder. */
export const legalEntity = {
  company: process.env.EXPO_PUBLIC_LEGAL_COMPANY || '[company name]',
  address: process.env.EXPO_PUBLIC_LEGAL_ADDRESS || '[registered address]',
  email: process.env.EXPO_PUBLIC_LEGAL_EMAIL || '[privacy email]',
  country: process.env.EXPO_PUBLIC_LEGAL_COUNTRY || '[country]',
};

export function fillPlaceholders(
  text: string,
  values: Record<string, string> = legalEntity,
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => values[key] ?? match);
}

export function fillBlock(block: LegalBlock): LegalBlock {
  return typeof block === 'string'
    ? fillPlaceholders(block)
    : { list: block.list.map((item) => fillPlaceholders(item)) };
}

/** The page on dietbuddy.me (or the configured URL); the same text inside the app if none is set. */
export function openLegal(kind: LegalKind): void {
  const url = kind === 'privacy' ? authConfig.privacyUrl : authConfig.termsUrl;
  if (url) Linking.openURL(url);
  else router.push(`/legal/${kind}` as Href);
}
