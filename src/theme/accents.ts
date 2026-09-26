import type { ColorSchemeName } from './tokens';

/**
 * Accent colours for numbers, labels and highlights. They are also used for small text, so each
 * keeps ≥4.5:1 contrast on the surfaces of its theme (WCAG AA, CLAUDE.md §5): light mode uses
 * darker shades of the prototype hues, and dark mode lighter shades where the prototype colour
 * (blue, violet, red) is too dark on the dark card.
 */
export const ACCENTS = {
  amber: { light: '#B45309', dark: '#F59E0B' },
  green: { light: '#047857', dark: '#10B981' },
  blue: { light: '#2563EB', dark: '#60A5FA' },
  violet: { light: '#7C3AED', dark: '#A78BFA' },
  red: { light: '#B91C1C', dark: '#F87171' },
  cyan: { light: '#0E7490', dark: '#06B6D4' },
} as const;

export type Accent = keyof typeof ACCENTS;

export function accentColor(accent: Accent, scheme: ColorSchemeName): string {
  return ACCENTS[accent][scheme];
}
