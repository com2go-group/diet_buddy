import { readFileSync } from 'fs';
import { join } from 'path';

import { palette } from '../tokens';

const css = readFileSync(join(__dirname, '../../../global.css'), 'utf8');

function cssVars(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const block = css.slice(start, css.indexOf('}', start));
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]!.trim()]),
  );
}

function hexToChannels(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

describe.each([
  ['light', ':root'],
  ['dark', '.dark:root'],
] as const)('%s tokens match global.css', (scheme, selector) => {
  const vars = cssVars(selector);

  it.each(Object.entries(palette[scheme]).filter(([key]) => key !== 'border'))('%s', (key, hex) => {
    expect(vars[kebab(key)]).toBe(hexToChannels(hex));
  });

  it('border', () => {
    const [, r, g, b, a] = /rgba\((\d+),(\d+),(\d+),([\d.]+)\)/.exec(palette[scheme].border)!;
    expect(vars.border).toBe(`${r} ${g} ${b}`);
    expect(vars['border-alpha']).toBe(a);
  });
});
