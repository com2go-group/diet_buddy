const withVar = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: withVar('background'),
        foreground: withVar('foreground'),
        card: withVar('card'),
        primary: {
          DEFAULT: withVar('primary'),
          foreground: withVar('primary-foreground'),
          // Text on light surfaces: amber-700 meets 4.5:1 where the brand amber is ~2:1.
          text: withVar('primary-text'),
          dark: '#D97706',
        },
        muted: { DEFAULT: withVar('muted'), foreground: withVar('muted-foreground') },
        accent: { DEFAULT: withVar('accent'), foreground: withVar('accent-foreground') },
        destructive: withVar('destructive'),
        border: 'rgb(var(--border) / var(--border-alpha))',
        protein: '#10B981',
        carbs: '#3B82F6',
        fat: '#8B5CF6',
        success: '#10B981',
        water: '#0EA5E9',
      },
      borderRadius: { sm: '12px', md: '14px', lg: '16px', xl: '20px', '2xl': '24px' },
      fontFamily: {
        sans: ['Inter_400Regular'],
        medium: ['Inter_500Medium'],
        semibold: ['Inter_600SemiBold'],
        bold: ['Inter_700Bold'],
        extrabold: ['Inter_800ExtraBold'],
      },
    },
  },
  plugins: [],
};
