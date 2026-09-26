import { bodyWidths, twinShapes } from '../geometry';

const palette = { background: '#bg', skin: '#skin', hair: '#hair', shirt: '#shirt' };
const VARIANTS = ['male', 'female', 'other'] as const;

describe('bodyWidths', () => {
  it('grows every part as fullness rises', () => {
    for (const variant of VARIANTS) {
      const [a, b, c] = [0, 0.5, 1].map((f) => bodyWidths(variant, f));
      for (const part of ['shoulder', 'belly', 'hip', 'thigh'] as const) {
        expect(a![part]).toBeLessThan(b![part]);
        expect(b![part]).toBeLessThan(c![part]);
      }
    }
  });

  it('rounds the belly past the chest only at higher fullness', () => {
    for (const variant of VARIANTS) {
      expect(bodyWidths(variant, 0).belly).toBeLessThan(bodyWidths(variant, 0).shoulder);
      expect(bodyWidths(variant, 1).belly).toBeGreaterThan(bodyWidths(variant, 1).shoulder);
    }
  });
});

describe('twinShapes', () => {
  it('clamps fullness to 0–1', () => {
    expect(twinShapes('female', -2, palette)).toEqual(twinShapes('female', 0, palette));
    expect(twinShapes('female', 5, palette)).toEqual(twinShapes('female', 1, palette));
  });

  it('draws the belly curve only on a fuller twin', () => {
    const curve = (f: number) =>
      twinShapes('male', f, palette).some((s) => s.kind === 'path' && s.stroke === '#000');
    expect(curve(0.2)).toBe(false);
    expect(curve(0.8)).toBe(true);
  });

  it('uses the palette and only draws long hair for the variants that have it', () => {
    const hairShapes = (v: 'male' | 'female') =>
      twinShapes(v, 0.5, palette).filter((s) => 'fill' in s && s.fill === '#hair').length;
    expect(hairShapes('male')).toBe(1);
    expect(hairShapes('female')).toBe(2);
    const shapes = twinShapes('other', 0.5, palette);
    expect(shapes[0]).toMatchObject({ kind: 'circle', fill: '#bg' });
    expect(shapes.some((s) => s.kind === 'path' && s.fill === '#skin')).toBe(true);
  });

  it('widens the hair with a fuller face so it still covers the head', () => {
    const hair = (f: number) => {
      const s = twinShapes('male', f, palette).find((x) => 'fill' in x && x.fill === '#hair');
      return s && s.kind === 'path' ? Number(/^M([\d.]+)/.exec(s.d)?.[1]) : NaN;
    };
    expect(hair(1)).toBeLessThan(hair(0));
  });
});
