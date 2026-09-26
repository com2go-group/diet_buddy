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
      className={cn(variants[variant], tones[tone], className)}
      {...props}
    />
  );
}
