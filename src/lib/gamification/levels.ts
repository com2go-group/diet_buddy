/**
 * Levels from total XP (CLAUDE.md §7.15). Each level needs 100 XP more than the last:
 * level 2 at 100 XP, 3 at 300, 4 at 600, 5 at 1,000…
 */
export function xpForLevel(level: number): number {
  return (100 * (level - 1) * level) / 2;
}

export function levelFor(xp: number): {
  level: number;
  intoLevel: number;
  forNext: number;
  progress: number;
} {
  const safe = Math.max(0, Math.floor(xp));
  let level = 1;
  while (xpForLevel(level + 1) <= safe) level++;
  const start = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return {
    level,
    intoLevel: safe - start,
    forNext: next - safe,
    progress: (safe - start) / (next - start),
  };
}
