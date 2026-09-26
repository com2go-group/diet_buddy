/**
 * Design tokens (CLAUDE.md §5), sourced from prototype/src/styles/theme.css.
 *
 * Tailwind classes read the same values from CSS variables in global.css.
 * Use these constants only where a raw value is needed (SVG, charts, native
 * APIs such as StatusBar or navigation themes). tokens.test.ts keeps the two
 * files in sync.
 */

export type ColorSchemeName = 'light' | 'dark';

export const palette = {
  light: {
    background: '#F9F7F4',
    foreground: '#1F2937',
    card: '#FFFFFF',
    primary: '#F59E0B',
    primaryForeground: '#FFFFFF',
    primaryText: '#A34A08',
    muted: '#F3F4F6',
    mutedForeground: '#5F6673',
    accent: '#FEF3C7',
    accentForeground: '#92400E',
    destructive: '#EF4444',
    border: 'rgba(0,0,0,0.08)',
  },
  dark: {
    background: '#0F172A',
    foreground: '#F9FAFB',
    card: '#1E293B',
    primary: '#F59E0B',
    primaryForeground: '#FFFFFF',
    primaryText: '#F59E0B',
    muted: '#1E293B',
    mutedForeground: '#94A3B8',
    accent: '#2D1A00',
    accentForeground: '#FDE68A',
    destructive: '#EF4444',
    border: 'rgba(255,255,255,0.08)',
  },
} as const satisfies Record<ColorSchemeName, Record<string, string>>;

export type ThemeColors = (typeof palette)[ColorSchemeName];

export const brand = {
  gradient: ['#F59E0B', '#D97706'] as const,
  protein: '#10B981',
  carbs: '#3B82F6',
  fat: '#8B5CF6',
  success: '#10B981',
  water: '#0EA5E9',
} as const;

/** Unfilled ring/progress track. Dark mode needs its own value: muted equals the card color there. */
export const trackColor: Record<ColorSchemeName, string> = { light: '#F3F4F6', dark: '#334155' };

export const radius = { sm: 12, md: 14, lg: 16, xl: 20, full: 9999 } as const;

export const motion = {
  fast: 250,
  base: 320,
  slow: 420,
  spring: { damping: 20, stiffness: 220, mass: 0.9 },
} as const;

/** Minimum touch target (CLAUDE.md §5 accessibility). */
export const MIN_TOUCH_TARGET = 44;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;
