import type { Rules } from './types.js';

const single = (face: number) => ({ 1: 100, 5: 50 })[face as 1 | 5] ?? 0;
const triple = (face: number) => ({ 1: 1000, 5: 500 })[face as 1 | 5] ?? face * 100;

/**
 * Points of a set of dice from one throw, or -1 if any die does not score.
 * With doubling off only three of a kind counts as a combination: further equal dice score
 * as singles (1s and 5s) or make the set invalid (other faces).
 */
export function scoreDice(
  values: readonly number[],
  rules: Pick<Rules, 'fourOfAKindDoubling'>,
): number {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const v of values) counts[v]++;
  let sum = 0;
  for (let face = 1; face <= 6; face++) {
    const n = counts[face];
    if (n === 0) continue;
    let points = n * single(face);
    if (n >= 3) {
      const extra = n - 3;
      points = rules.fourOfAKindDoubling
        ? triple(face) * 2 ** extra
        : triple(face) + extra * single(face);
      if (!rules.fourOfAKindDoubling && extra > 0 && single(face) === 0) return -1;
    }
    if (points === 0) return -1;
    sum += points;
  }
  return sum;
}

/** False means the throw is a bust. */
export function hasScoringDie(values: readonly number[]): boolean {
  return values.some((v) => v === 1 || v === 5 || values.filter((w) => w === v).length >= 3);
}
