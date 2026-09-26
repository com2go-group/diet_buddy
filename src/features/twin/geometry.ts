import type { TwinVariant } from './twin';

/** One drawing primitive in a 200 × 300 view box; `TwinAvatar` maps these to SVG elements. */
export type Shape =
  | { kind: 'circle'; cx: number; cy: number; r: number; fill: string; opacity?: number }
  | {
      kind: 'ellipse';
      cx: number;
      cy: number;
      rx: number;
      ry: number;
      fill: string;
      opacity?: number;
    }
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; stroke: string; width: number }
  | { kind: 'path'; d: string; fill?: string; stroke?: string; width?: number };

export interface Palette {
  background: string;
  skin: string;
  hair: string;
  shirt: string;
}

const SHORTS = '#334155';
const SHOES = '#475569';
const EYES = '#1F2937';
const BLUSH = '#F472B6';

/** Half-widths of shoulders, waist and hips at fullness 0, and how much each grows by 1. */
const BUILD: Record<
  TwinVariant,
  { s: [number, number]; w: [number, number]; h: [number, number] }
> = {
  male: { s: [40, 14], w: [24, 34], h: [30, 26] },
  female: { s: [34, 12], w: [20, 32], h: [34, 30] },
  other: { s: [37, 13], w: [22, 33], h: [32, 28] },
};

const HAIR_BACK: Record<TwinVariant, string | null> = {
  male: null,
  female: 'M66 62C64 30 84 24 100 24C116 24 136 30 134 62L137 102C124 108 76 108 63 102Z',
  other:
    'M68 62C66 32 84 25 100 25C116 25 134 32 132 62L132 86C126 90 122 88 122 82L78 82C78 88 74 90 68 86Z',
};
const HAIR_FRONT: Record<TwinVariant, string> = {
  male: 'M70 60C68 36 84 26 100 26C118 26 132 36 130 60C124 48 112 42 100 44C88 42 76 48 70 60Z',
  female: 'M70 58C70 34 86 27 100 27C116 27 130 36 130 58C118 50 106 40 96 42C88 46 80 52 70 58Z',
  other: 'M70 60C68 34 86 26 102 26C120 26 132 38 130 56C116 44 98 44 86 50C80 53 74 57 70 60Z',
};

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * The twin as drawing primitives, back to front. `f` (0–1) widens the waist most, then hips,
 * shoulders, limbs and cheeks, so changes over time are visible without caricature.
 */
export function twinShapes(variant: TwinVariant, fullness: number, p: Palette): Shape[] {
  const f = Math.min(1, Math.max(0, fullness));
  const b = BUILD[variant];
  const S = r1(b.s[0] + b.s[1] * f);
  const W = r1(b.w[0] + b.w[1] * f);
  const H = r1(b.h[0] + b.h[1] * f);
  const L = 100 - S;
  const R = 100 + S;
  const leg = r1(15 + 16 * f);
  const arm = r1(12 + 12 * f);
  const handOut = r1(4 + 10 * f);
  const face = r1(27 + 7 * f);
  const legX = [r1(100 - Math.max(H * 0.5, leg / 2 + 2)), r1(100 + Math.max(H * 0.5, leg / 2 + 2))];
  const torso =
    `M${L + 8} 106Q${L} 106 ${L} 118C${L} 138 ${100 - W} 145 ${100 - W} 160` +
    `C${100 - W} 178 ${100 - H} 185 ${100 - H} 200L${100 + H} 200` +
    `C${100 + H} 185 ${100 + W} 178 ${100 + W} 160C${100 + W} 145 ${R} 138 ${R} 118` +
    `Q${R} 106 ${R - 8} 106Z`;
  const shorts =
    `M${100 - H} 196L${100 + H} 196L${100 + H + 2} 232L104 232L100 214L96 232` +
    `L${100 - H - 2} 232Z`;
  const arms: [number, number][] = [
    [L + arm / 2 - 2, L - handOut],
    [R - arm / 2 + 2, R + handOut],
  ];
  const hairBack = HAIR_BACK[variant];
  return [
    { kind: 'circle', cx: 100, cy: 150, r: 96, fill: p.background },
    { kind: 'ellipse', cx: 100, cy: 290, rx: r1(44 + 22 * f), ry: 6, fill: '#000', opacity: 0.12 },
    ...legX.flatMap((x): Shape[] => [
      { kind: 'line', x1: x, y1: 226, x2: x, y2: 278, stroke: p.skin, width: leg },
      { kind: 'ellipse', cx: x, cy: 284, rx: r1(leg / 2 + 5), ry: 7, fill: SHOES },
    ]),
    { kind: 'path', d: shorts, fill: SHORTS },
    ...arms.flatMap(([from, to]): Shape[] => [
      { kind: 'line', x1: from, y1: 114, x2: to, y2: 196, stroke: p.skin, width: arm },
      {
        kind: 'line',
        x1: from,
        y1: 114,
        x2: r1(from + (to - from) * 0.35),
        y2: 142,
        stroke: p.shirt,
        width: arm + 4,
      },
    ]),
    { kind: 'path', d: torso, fill: p.shirt },
    { kind: 'line', x1: 100, y1: 86, x2: 100, y2: 106, stroke: p.skin, width: r1(16 + 8 * f) },
    ...(hairBack ? [{ kind: 'path', d: hairBack, fill: p.hair } as const] : []),
    { kind: 'circle', cx: 100 - face - 1, cy: 66, r: 6, fill: p.skin },
    { kind: 'circle', cx: 100 + face + 1, cy: 66, r: 6, fill: p.skin },
    { kind: 'ellipse', cx: 100, cy: 62, rx: face, ry: 31, fill: p.skin },
    { kind: 'path', d: HAIR_FRONT[variant], fill: p.hair },
    { kind: 'circle', cx: 89, cy: 64, r: 3.2, fill: EYES },
    { kind: 'circle', cx: 111, cy: 64, r: 3.2, fill: EYES },
    { kind: 'circle', cx: r1(84 - 2 * f), cy: 74, r: r1(5 + 2 * f), fill: BLUSH, opacity: 0.3 },
    { kind: 'circle', cx: r1(116 + 2 * f), cy: 74, r: r1(5 + 2 * f), fill: BLUSH, opacity: 0.3 },
    { kind: 'path', d: 'M91 76Q100 84 109 76', stroke: EYES, width: 2.4 },
  ];
}
