/**
 * Code-level privacy check for wellness insights: an insight must not repeat the user's own
 * words. Any run of QUOTE_WORDS consecutive words that also appears in a message counts as a
 * quote, whatever the prompt said.
 */

export const QUOTE_WORDS = 6;

const words = (text: string) =>
  text
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);

function grams(text: string, n: number): string[] {
  const w = words(text);
  const out: string[] = [];
  for (let i = 0; i + n <= w.length; i++) out.push(w.slice(i, i + n).join(' '));
  return out;
}

/** True when `text` repeats QUOTE_WORDS or more consecutive words from any message. */
export function quotesMessages(text: string, messages: string[], n = QUOTE_WORDS): boolean {
  const seen = new Set(messages.flatMap((m) => grams(m, n)));
  return grams(text, n).some((g) => seen.has(g));
}
