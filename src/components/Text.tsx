import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { cn } from './cn';

const variants = {
  kpi: 'text-5xl leading-[56px] font-extrabold',
  display: 'text-3xl leading-9 font-extrabold',
  title: 'text-2xl leading-8 font-extrabold',
  heading: 'text-lg leading-6 font-bold',
  body: 'text-base leading-6 font-sans',
  label: 'text-sm leading-5 font-semibold',
  caption: 'text-xs leading-4 font-medium',
} as const;

const tones = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  // Brand amber is too light for text on light surfaces; primary-text is AA-compliant.
  primary: 'text-primary-text',
  accent: 'text-accent-foreground',
  destructive: 'text-destructive',
  success: 'text-success',
  inverse: 'text-primary-foreground',
} as const;

export type TextVariant = keyof typeof variants;

// Class groups a caller's className may override. Two classes from one group conflict, and which
// wins depends on stylesheet order, so the variant's class is dropped when the caller sets one.
const groups = [
  /^text-(xs|sm|base|lg|\d?xl|\[[\d.]+px\])$/,
  /^leading-/,
  /^font-(sans|medium|semibold|bold|extrabold)$/,
];

const isColor = (c: string) =>
  c.startsWith('text-') && !groups[0]!.test(c) && !/^text-(center|left|right|justify)$/.test(c);

/** The tone's colour class, unless the caller's className sets its own text colour. */
export function toneClass(tone: TextTone, className?: string): string | undefined {
  return className?.split(/\s+/).some(isColor) ? undefined : tones[tone];
}

/** The variant's classes, minus any group the caller's className overrides. */
export function variantClasses(variant: TextVariant, className?: string): string {
  const own = className?.split(/\s+/) ?? [];
  return variants[variant]
    .split(' ')
    .filter((c) => !groups.some((g) => g.test(c) && own.some((o) => g.test(o))))
    .join(' ');
}
export type TextTone = keyof typeof tones;

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
  className?: string;
}

/**
 * Themed text. Inter needs a font family per weight on native, so weight comes from the
 * font-* classes (see tailwind.config.js) rather than fontWeight. Dynamic type is on, capped so
 * large accessibility sizes don't break layouts.
 */
export function Text({ variant = 'body', tone = 'default', className, ...props }: TextProps) {
  return (
    <RNText
      maxFontSizeMultiplier={variant === 'kpi' ? 1.3 : 1.8}
      className={cn(variantClasses(variant, className), toneClass(tone, className), className)}
      {...props}
    />
  );
}
