import type { CpSplit } from '../types';

/**
 * Relative difficulty: rank segments by pace within the race,
 * color in thirds (green = easy, amber = moderate, red = hard).
 *
 * Returns one color per split. Works for both inline-style hex
 * and Tailwind class output via the `format` option.
 */
export function difficultyColors(
  splits: CpSplit[],
  format: 'hex' | 'tailwind' = 'hex',
): string[] {
  if (splits.length === 0) return [];

  const paces = splits.map(s => s.estimatedPace);
  const sorted = [...paces].sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length / 3)] ?? sorted[0];
  const hi = sorted[Math.floor((sorted.length * 2) / 3)] ?? sorted[sorted.length - 1];

  const palette = format === 'tailwind'
    ? { easy: 'bg-emerald-500', mid: 'bg-amber-500', hard: 'bg-red-500' }
    : { easy: '#10b981', mid: '#f59e0b', hard: '#ef4444' };

  return paces.map(p => {
    if (p <= lo) return palette.easy;
    if (p <= hi) return palette.mid;
    return palette.hard;
  });
}

/** Whether a split falls in the "hard" third */
export function isHardSegment(splits: CpSplit[], index: number): boolean {
  if (splits.length === 0) return false;
  const sorted = [...splits.map(s => s.estimatedPace)].sort((a, b) => a - b);
  const hi = sorted[Math.floor((sorted.length * 2) / 3)] ?? sorted[sorted.length - 1];
  return splits[index].estimatedPace > hi;
}
