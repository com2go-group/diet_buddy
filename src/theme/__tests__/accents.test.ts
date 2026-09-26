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
  it('meets 3:1 (large text) on light surfaces', () => {
    expect(contrast(light, palette.light.background)).toBeGreaterThanOrEqual(3);
    expect(contrast(light, palette.light.card)).toBeGreaterThanOrEqual(3);
    expect(contrast(light, palette.light.muted)).toBeGreaterThanOrEqual(3);
  });

  it('meets 3:1 (large text) on dark surfaces', () => {
    expect(contrast(dark, palette.dark.background)).toBeGreaterThanOrEqual(3);
    expect(contrast(dark, palette.dark.card)).toBeGreaterThanOrEqual(3);
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
