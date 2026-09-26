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
  | { kind: 'path'; d: string; fill?: string; stroke?: string; width?: number; opacity?: number };

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

/** Half-widths at fullness 0 and growth by fullness 1: shoulders, belly, hips, thighs. */
const BUILD: Record<TwinVariant, Record<'s' | 'b' | 'h' | 't', [number, number]>> = {
  male: { s: [40, 12], b: [24, 42], h: [30, 28], t: [9, 17] },
  female: { s: [34, 11], b: [21, 38], h: [35, 32], t: [10, 18] },
  other: { s: [37, 11], b: [22, 40], h: [32, 30], t: [9.5, 17.5] },
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
/** Face half-width the hair paths were drawn for. */
const HAIR_FACE = 29;

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Scales a path of absolute x/y pairs horizontally around the centre line (x = 100). */
function scaleX(d: string, k: number): string {
  let isX = true;
  return d.replace(/-?\d+(\.\d+)?/g, (n) => {
    const out = isX ? r1(100 + (Number(n) - 100) * k) : Number(n);
    isX = !isX;
    return String(out);
  });
}

export interface BodyWidths {
  shoulder: number;
  belly: number;
  hip: number;
  thigh: number;
}

/** Half-widths of the body for a fullness (clamped to 0–1). */
export function bodyWidths(variant: TwinVariant, fullness: number): BodyWidths {
  const f = Math.min(1, Math.max(0, fullness));
  const b = BUILD[variant];
  const at = ([base, grow]: [number, number]) => r1(base + grow * f);
  return { shoulder: at(b.s), belly: at(b.b), hip: at(b.h), thigh: at(b.t) };
}

/**
 * The twin as drawing primitives, back to front. Fullness (0–1) rounds the belly past the chest,
 * widens hips and thighs until they meet, and fills out arms, face and chin, so changes over
 * time are easy to see while the figure stays friendly.
 */
export function twinShapes(variant: TwinVariant, fullness: number, p: Palette): Shape[] {
  const f = Math.min(1, Math.max(0, fullness));
  const { shoulder: S, belly: B, hip: H, thigh: T } = bodyWidths(variant, f);
  const by = r1(164 + 6 * f);
  const torso =
    `M${100 - S + 8} 106Q${100 - S} 106 ${100 - S} 120` +
    `C${100 - S} 142 ${100 - B} ${by - 26} ${100 - B} ${by}` +
    `C${100 - B} ${by + 18} ${100 - H} 190 ${100 - H} 202L${100 + H} 202` +
    `C${100 + H} 190 ${100 + B} ${by + 18} ${100 + B} ${by}` +
    `C${100 + B} ${by - 26} ${100 + S} 142 ${100 + S} 120` +
    `Q${100 + S} 106 ${100 + S - 8} 106Z`;

  // Legs taper from the thigh to the ankle; at full fullness the thighs meet.
  const calf = r1(6.5 + 5 * f);
  const ankle = r1(5 + 2 * f);
  const legX = r1(T + 2 + 6 * (1 - f));
  const legs = [100 - legX, 100 + legX].map((x) => ({
    x,
    d:
      `M${r1(x - T)} 222C${r1(x - T)} 248 ${r1(x - calf - 1)} 258 ${r1(x - calf)} 266` +
      `L${r1(x - ankle)} 280L${r1(x + ankle)} 280L${r1(x + calf)} 266` +
      `C${r1(x + calf + 1)} 258 ${r1(x + T)} 248 ${r1(x + T)} 222Z`,
  }));
  const outer = r1(legX + T + 2);
  const shorts =
    `M${100 - H} 196L${100 + H} 196C${100 + H + 2} 214 ${100 + outer} 226 ${100 + outer} 236` +
    `L102 236L100 224L98 236L${100 - outer} 236C${100 - outer} 226 ${100 - H - 2} 214 ${100 - H} 196Z`;

  // Arms hang clear of the belly and fill out with the body.
  const upper = r1(13 + 15 * f);
  const fore = r1(11 + 9 * f);
  const elbowOut = r1(Math.max(S, B) + upper * 0.35);
  const handOut = r1(elbowOut + 3 + 5 * f);
  const arms = [-1, 1].flatMap((side): Shape[] => {
    const sx = r1(100 + side * (S - upper / 2 + 2));
    const ex = r1(100 + side * elbowOut);
    const hx = r1(100 + side * handOut);
    return [
      { kind: 'line', x1: sx, y1: 116, x2: ex, y2: 158, stroke: p.skin, width: upper },
      { kind: 'line', x1: ex, y1: 158, x2: hx, y2: 194, stroke: p.skin, width: fore },
      { kind: 'circle', cx: hx, cy: 196, r: r1(fore / 2 + 1.5), fill: p.skin },
      {
        kind: 'line',
        x1: sx,
        y1: 116,
        x2: r1(sx + (ex - sx) * 0.45),
        y2: 135,
        stroke: p.shirt,
        width: upper + 4,
      },
    ];
  });

  const face = r1(27 + 10 * f);
  const hairScale = Math.max(1, face / HAIR_FACE);
  const hairBack = HAIR_BACK[variant];
  return [
    { kind: 'circle', cx: 100, cy: 150, r: 96, fill: p.background },
    { kind: 'ellipse', cx: 100, cy: 290, rx: r1(44 + 26 * f), ry: 6, fill: '#000', opacity: 0.12 },
    ...legs.flatMap(({ x, d }): Shape[] => [
      { kind: 'path', d, fill: p.skin },
      { kind: 'ellipse', cx: x, cy: 284, rx: r1(ankle + 7), ry: 7, fill: SHOES },
    ]),
    { kind: 'path', d: shorts, fill: SHORTS },
    ...arms,
    { kind: 'path', d: torso, fill: p.shirt },
    // A soft curve under a rounder belly.
    ...(f > 0.3
      ? [
          {
            kind: 'path',
            d: `M${r1(100 - B * 0.55)} ${r1(by + 14)}Q100 ${r1(by + 22 + 8 * f)} ${r1(100 + B * 0.55)} ${r1(by + 14)}`,
            stroke: '#000',
            width: 2.5,
            opacity: 0.15,
          } as const,
        ]
      : []),
    { kind: 'line', x1: 100, y1: 86, x2: 100, y2: 104, stroke: p.skin, width: r1(16 + 12 * f) },
    ...(hairBack ? [{ kind: 'path', d: scaleX(hairBack, hairScale), fill: p.hair } as const] : []),
    { kind: 'ellipse', cx: 100, cy: 88, rx: r1(14 + 14 * f), ry: r1(3 + 7 * f), fill: p.skin },
    { kind: 'circle', cx: 100 - face - 1, cy: 66, r: 6, fill: p.skin },
    { kind: 'circle', cx: 100 + face + 1, cy: 66, r: 6, fill: p.skin },
    { kind: 'ellipse', cx: 100, cy: 62, rx: face, ry: r1(31 + 3 * f), fill: p.skin },
    { kind: 'path', d: scaleX(HAIR_FRONT[variant], hairScale), fill: p.hair },
    { kind: 'circle', cx: 89, cy: 64, r: 3.2, fill: EYES },
    { kind: 'circle', cx: 111, cy: 64, r: 3.2, fill: EYES },
    { kind: 'circle', cx: r1(84 - 3 * f), cy: 75, r: r1(5 + 3 * f), fill: BLUSH, opacity: 0.3 },
    { kind: 'circle', cx: r1(116 + 3 * f), cy: 75, r: r1(5 + 3 * f), fill: BLUSH, opacity: 0.3 },
    { kind: 'path', d: 'M91 77Q100 85 109 77', stroke: EYES, width: 2.4 },
  ];
}
