import { scoreDice } from '../scoring.js';

/** A scoring selection from one throw: points and number of dice used. */
export interface Pick {
  readonly points: number;
  readonly dice: number;
}

/** One distinct throw result (multiset of faces) of `n` dice. */
export interface Outcome {
  readonly prob: number;
  /** Distinct (points, dice) selections that use only scoring dice; empty means bust. */
  readonly picks: readonly Pick[];
  /** The selection with the most dice, then the most points; null on a bust. */
  readonly all: Pick | null;
}

const FACTORIAL = [1, 1, 2, 6, 24, 120, 720];

function compositions(n: number, faces: number): number[][] {
  if (faces === 1) return [[n]];
  const result: number[][] = [];
  for (let first = 0; first <= n; first++) {
    for (const rest of compositions(n - first, faces - 1)) result.push([first, ...rest]);
  }
  return result;
}

/** Points of `count` dice showing `face` on their own (-1 if they do not all score), taken from `scoreDice`. */
function faceTable(doubling: boolean): number[][] {
  return [1, 2, 3, 4, 5, 6].map((face) =>
    Array.from({ length: 7 }, (_, count) =>
      count === 0
        ? 0
        : scoreDice(new Array<number>(count).fill(face), { fourOfAKindDoubling: doubling }),
    ),
  );
}

function picksOf(counts: readonly number[], table: readonly (readonly number[])[]): Pick[] {
  const seen = new Map<number, Pick>();
  // scores are additive over faces, so walk the faces and sum without building dice arrays
  const walk = (face: number, points: number, dice: number): void => {
    if (face === 6) {
      if (dice > 0) seen.set(points * 8 + dice, { points, dice });
      return;
    }
    for (let c = 0; c <= counts[face]; c++) {
      const p = table[face][c];
      if (p < 0) continue;
      walk(face + 1, points + p, dice + c);
    }
  };
  walk(0, 0, 0);
  return [...seen.values()];
}

function build(n: number, doubling: boolean): Outcome[] {
  const table = faceTable(doubling);
  return compositions(n, 6).map((counts) => {
    const arrangements = FACTORIAL[n] / counts.reduce((p, c) => p * FACTORIAL[c], 1);
    const picks = picksOf(counts, table);
    const all = picks.reduce<Pick | null>(
      (best, p) =>
        best === null || p.dice > best.dice || (p.dice === best.dice && p.points > best.points)
          ? p
          : best,
      null,
    );
    return { prob: arrangements / 6 ** n, picks, all };
  });
}

const cache = new Map<string, Outcome[]>();

/** All distinct results of throwing `n` (1..6) dice with their exact probability; built once and shared. */
export function outcomes(n: number, doubling: boolean): readonly Outcome[] {
  const key = `${n}/${doubling}`;
  let result = cache.get(key);
  if (!result) {
    result = build(n, doubling);
    cache.set(key, result);
  }
  return result;
}

/** Probability that a throw of `n` dice has no scoring die. */
export function bustProbability(n: number, doubling: boolean): number {
  return outcomes(n, doubling)
    .filter((o) => o.picks.length === 0)
    .reduce((sum, o) => sum + o.prob, 0);
}

/** Statistics of a run on a card that forces all dice (Star, Double Lotte, Plus/Minus, Clover). */
export interface AllDiceStats {
  /** Probability to end the run with a Volle Lotte. */
  readonly volleLotte: number;
  /** Run points at the Volle Lotte with their probability. */
  readonly volleLotteRuns: readonly (readonly [run: number, prob: number])[];
  readonly bust: number;
  /** Sum over busts of probability * run points collected before the bust. */
  readonly bustRun: number;
  /** Expected run points when the run ends, by Volle Lotte or bust. */
  readonly endRun: number;
}

const statsCache = new Map<boolean, AllDiceStats>();

/** Forward pass over the run with the "most dice, then most points" selection. */
export function allDiceStats(doubling: boolean): AllDiceStats {
  const cached = statsCache.get(doubling);
  if (cached) return cached;
  const mass = new Map<string, number>([['6/0', 1]]);
  const vl = new Map<number, number>();
  let bust = 0;
  let bustRun = 0;
  for (let n = 6; n >= 1; n--) {
    for (const [key, m] of [...mass].filter(([k]) => k.startsWith(`${n}/`))) {
      const run = Number(key.split('/')[1]);
      for (const o of outcomes(n, doubling)) {
        const p = m * o.prob;
        if (!o.all) {
          bust += p;
          bustRun += p * run;
        } else if (o.all.dice === n) {
          vl.set(run + o.all.points, (vl.get(run + o.all.points) ?? 0) + p);
        } else {
          const next = `${n - o.all.dice}/${run + o.all.points}`;
          mass.set(next, (mass.get(next) ?? 0) + p);
        }
      }
    }
  }
  const volleLotteRuns = [...vl].sort((a, b) => a[0] - b[0]);
  const stats: AllDiceStats = {
    volleLotte: volleLotteRuns.reduce((s, [, p]) => s + p, 0),
    volleLotteRuns,
    bust,
    bustRun,
    endRun: bustRun + volleLotteRuns.reduce((s, [r, p]) => s + r * p, 0),
  };
  statsCache.set(doubling, stats);
  return stats;
}

let streetProbability: number | undefined;

/** Probability to complete a Street (all six values) when each throw takes one die of every missing value. */
export function streetChance(): number {
  if (streetProbability !== undefined) return streetProbability;
  const memo = new Map<number, number>();
  const popcount = (x: number) => x.toString(2).replace(/0/g, '').length;
  const win = (have: number): number => {
    const k = 6 - popcount(have);
    if (k === 0) return 1;
    const cached = memo.get(have);
    if (cached !== undefined) return cached;
    let total = 0;
    // every non-empty subset `gain` of the missing values: dice show exactly the faces `have | gain` and cover `gain`
    for (let gain = 1; gain < 1 << 6; gain++) {
      if (gain & have) continue;
      const g = popcount(gain);
      let ways = 0;
      for (let sub = gain; ; sub = (sub - 1) & gain) {
        const j = popcount(sub);
        ways += (-1) ** (g - j) * (popcount(have) + j) ** k;
        if (sub === 0) break;
      }
      total += (ways / 6 ** k) * win(have | gain);
    }
    memo.set(have, total);
    return total;
  };
  streetProbability = win(0);
  return streetProbability;
}
