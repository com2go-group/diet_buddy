import { twinShapes, type Shape } from '../geometry';

const palette = { background: '#bg', skin: '#skin', hair: '#hair', shirt: '#shirt' };
/** Half-width of the torso at the waist (y = 160), read from the torso path. */
const waist = (shapes: Shape[]) => {
  const torso = shapes.find((s) => s.kind === 'path' && s.fill === '#shirt');
  const match = torso && torso.kind === 'path' ? / [\d.]+ 145 ([\d.]+) 160/.exec(torso.d) : null;
  return 100 - Number(match?.[1]);
};

describe('twinShapes', () => {
  it('gets fuller as fullness rises, for every variant', () => {
    for (const variant of ['male', 'female', 'other'] as const) {
      const widths = [0, 0.5, 1].map((f) => waist(twinShapes(variant, f, palette)));
      expect(widths[0]).toBeLessThan(widths[1]!);
      expect(widths[1]).toBeLessThan(widths[2]!);
    }
  });

  it('clamps fullness to 0–1', () => {
    expect(twinShapes('female', -2, palette)).toEqual(twinShapes('female', 0, palette));
    expect(twinShapes('female', 5, palette)).toEqual(twinShapes('female', 1, palette));
  });

  it('uses the palette and only draws long hair for the variants that have it', () => {
    const hairShapes = (v: 'male' | 'female') =>
      twinShapes(v, 0.5, palette).filter((s) => 'fill' in s && s.fill === '#hair').length;
    expect(hairShapes('male')).toBe(1);
    expect(hairShapes('female')).toBe(2);
    const shapes = twinShapes('other', 0.5, palette);
    expect(shapes[0]).toMatchObject({ kind: 'circle', fill: '#bg' });
    expect(shapes.some((s) => s.kind === 'line' && s.stroke === '#skin')).toBe(true);
  });
});
