/**
 * Code-level screen for AI insights (CLAUDE.md §9): anything that reads as restrictive or risky
 * advice is rejected, whatever the prompt said.
 */

const UNSAFE = [
  /\bskip(ping|ped)? (a |your )?(meals?|breakfast|lunch|dinner|snacks?)\b/i,
  /\bfast(ing|ed)\b/i,
  /\b(water|juice|dry) fast\b/i,
  /\b(detox|cleanse|juice cleanse)\w*/i,
  /\bpurg(e|ed|ing)\b/i,
  /\blaxatives?\b/i,
  /\bdiuretics?\b/i,
  /\b(diet|weight[- ]loss) pills?\b/i,
  /\bappetite suppress\w*/i,
  /\bsupplements?\b/i,
  /\bstarv\w*/i,
  /\beat (even )?less than (your )?(target|goal)\b/i,
  /\b(cut|drop|lower) (your )?(calories|intake) (further|more|below)\b/i,
];

export function unsafeText(text: string): boolean {
  return UNSAFE.some((r) => r.test(text));
}
