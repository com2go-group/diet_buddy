import { colorScheme as nativewindColorScheme, useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { Platform, useColorScheme as useSystemColorScheme } from 'react-native';

import { palette, type ColorSchemeName, type ThemeColors } from './tokens';
import { useThemeStore } from './themeStore';

/** Applies the stored preference to NativeWind. Mount once, in the root layout. */
export function useApplyThemePreference(): void {
  const preference = useThemeStore((s) => s.preference);
  const system = useSystemColorScheme();
  useEffect(() => {
    // On web NativeWind's 'system' just removes the dark class, so resolve it to the OS scheme.
    const resolved =
      Platform.OS === 'web' && preference === 'system'
        ? system === 'dark'
          ? 'dark'
          : 'light'
        : preference;
    nativewindColorScheme.set(resolved);
  }, [preference, system]);
}

/** The resolved scheme and its raw colors, for places Tailwind classes can't reach (SVG, charts). */
export function useTheme(): { scheme: ColorSchemeName; colors: ThemeColors } {
  const { colorScheme } = useColorScheme();
  const scheme: ColorSchemeName = colorScheme === 'dark' ? 'dark' : 'light';
  return { scheme, colors: palette[scheme] };
}
