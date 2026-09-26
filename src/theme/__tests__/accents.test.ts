import { ACCENTS } from '../accents';
import { palette } from '../tokens';

/** WCAG relative luminance and contrast ratio. */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

describe.each(Object.entries(ACCENTS))('%s accent', (_, { light, dark }) => {
  it('meets 4.5:1 (normal text) on light surfaces', () => {
    expect(contrast(light, palette.light.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light, palette.light.card)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light, palette.light.muted)).toBeGreaterThanOrEqual(4.5);
  });

  it('meets 4.5:1 (normal text) on dark surfaces', () => {
    expect(contrast(dark, palette.dark.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(dark, palette.dark.card)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('prototype amber on light background', () => {
  it('fails AA, which is why light mode uses a darker shade', () => {
    expect(contrast('#F59E0B', palette.light.background)).toBeLessThan(3);
  });
});

describe('primary text colour', () => {
  it('meets 4.5:1 (normal text) on every surface in both themes', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const p = palette[scheme];
      for (const surface of [p.background, p.card, p.muted]) {
        expect(contrast(p.primaryText, surface)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe('secondary and primary text on tinted surfaces (light)', () => {
  // Muted panels, amber and blue tints used behind selected chips, callouts and notes.
  const tints = ['#F3F4F6', '#FEF3C7', '#F9EEDD', '#F1E3D8', '#E6EBF4'];
  it.each(tints)('muted and primary text meet 4.5:1 on %s', (tint) => {
    expect(contrast(palette.light.mutedForeground, tint)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(palette.light.primaryText, tint)).toBeGreaterThanOrEqual(4.5);
  });
});
