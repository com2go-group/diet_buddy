import type { ColorSchemeName } from './tokens';

/**
 * Accent colours for large numbers and highlights. Dark mode uses the prototype's colours;
 * light mode uses darker shades of the same hues so text keeps ≥3:1 contrast on light
 * surfaces (WCAG AA for large text, CLAUDE.md §5).
 */
export const ACCENTS = {
  amber: { light: '#B45309', dark: '#F59E0B' },
  green: { light: '#047857', dark: '#10B981' },
  blue: { light: '#2563EB', dark: '#3B82F6' },
  violet: { light: '#7C3AED', dark: '#8B5CF6' },
  red: { light: '#DC2626', dark: '#EF4444' },
  cyan: { light: '#0E7490', dark: '#06B6D4' },
} as const;

export type Accent = keyof typeof ACCENTS;

export function accentColor(accent: Accent, scheme: ColorSchemeName): string {
  return ACCENTS[accent][scheme];
}
