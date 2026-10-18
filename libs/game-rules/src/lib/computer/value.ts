import type { Rules } from '../types.js';
import {
  CARRIED_CAP,
  CARRIED_STEP,
  FORCED_DRAW_FACTOR,
  KAPPA_MAX,
  KAPPA_MIN,
  KAPPA_STEP,
  MAX_TABLES,
  RUN_CAP,
  RUN_STEP,
} from './constants.js';
import { Lru } from './lru.js';
import { outcomes } from './odds.js';
import type { Pick } from './odds.js';

/** Which card the run is played on: a Bonus card (Volle Lotte adds the bonus and banks) or a Double Lotte without carried points. */
export type Mode = 'bonus' | 'double';

export interface TableKey {
  readonly mode: Mode;
  readonly minimumPoints: number;
  readonly doubling: boolean;
  /** Carried points (bucketed by `CARRIED_STEP`). */
  readonly carried: number;
  /** Bonus of the card (mode bonus). */
  readonly bonus: number;
  readonly kappa: number;
}

/** kappa on the grid used for sharing tables. */
export const snapKappa = (kappa: number): number =>
  Math.round(Math.min(KAPPA_MAX, Math.max(KAPPA_MIN, kappa)) / KAPPA_STEP) * KAPPA_STEP;

/** Whether the carried points are low enough for the tables; above, the computer banks when allowed. */
export const withinCarriedCap = (carried: number): boolean => carried <= CARRIED_CAP;

const bucket = (carried: number) => Math.round(carried / CARRIED_STEP) * CARRIED_STEP;

/**
 * Expected final points of the best continuation of a run, by backward induction over
 * (free dice, run points). Run points are multiples of 50, so the table is exact in the run;
 * a bust is valued as `-kappa * points at stake`. Entries are computed lazily.
 */
export class ValueTable {
  private readonly values: Float64Array[];
  private readonly carried: number;

  constructor(private readonly key: TableKey) {
    this.carried = bucket(key.carried);
    this.values = Array.from({ length: 7 }, () =>
      new Float64Array(RUN_CAP / RUN_STEP + 1).fill(NaN),
    );
  }

  /** Points received by banking a run, or -Infinity when banking is not allowed. */
  bank(run: number): number {
    const allowed =
      run > 0 && run >= this.key.minimumPoints && (this.key.mode === 'bonus' || this.carried === 0);
    return allowed ? this.carried + run : -Infinity;
  }

  /** Value of a Volle Lotte after a pick that made the run `run`. */
  private volleLotte(run: number): number {
    const { mode, bonus, minimumPoints, kappa } = this.key;
    if (mode === 'double') {
      const doubled = run * 2;
      return doubled >= minimumPoints ? doubled : -kappa * run;
    }
    const total = this.carried + run + bonus;
    return run + bonus >= minimumPoints ? total : total * FORCED_DRAW_FACTOR;
  }

  /** Value after setting aside `pick` from `free` dice with `run` points so far. */
  afterPick(free: number, run: number, pick: Pick): number {
    const next = run + pick.points;
    const left = free - pick.dice;
    if (left === 0) return this.volleLotte(next);
    return this.value(left, next);
  }

  /** Expected value of throwing `free` dice with `run` points so far. */
  throwValue(free: number, run: number): number {
    const { doubling, kappa, mode } = this.key;
    const atStake = this.carried + run;
    let sum = 0;
    for (const o of outcomes(free, doubling)) {
      if (!o.all) {
        sum += o.prob * -kappa * atStake;
        continue;
      }
      const maxDice = o.all.dice;
      let best = -Infinity;
      for (const pick of o.picks) {
        if (mode === 'double' && pick.dice !== maxDice) continue;
        const v = this.afterPick(free, run, pick);
        if (v > best) best = v;
      }
      sum += o.prob * best;
    }
    return sum;
  }

  /** Best of banking and throwing. */
  value(free: number, run: number): number {
    if (run > RUN_CAP) return this.bank(run) > -Infinity ? this.bank(run) : this.carried + run;
    const slot = this.values[free];
    const index = run / RUN_STEP;
    const cached = slot[index];
    if (!Number.isNaN(cached)) return cached;
    const v = Math.max(this.bank(run), this.throwValue(free, run));
    slot[index] = v;
    return v;
  }
}

const tables = new Lru<string, ValueTable>(MAX_TABLES);

/** Shared table for a rule set, carried bucket and kappa; built lazily, bounded by an LRU. */
export function tableFor(
  rules: Rules,
  mode: Mode,
  carried: number,
  bonus: number,
  kappa: number,
): ValueTable {
  const key: TableKey = {
    mode,
    minimumPoints: rules.minimumPoints,
    doubling: rules.fourOfAKindDoubling,
    carried: bucket(carried),
    bonus,
    kappa: snapKappa(kappa),
  };
  const id = `${mode}|${key.minimumPoints}|${key.doubling}|${key.carried}|${bonus}|${key.kappa.toFixed(2)}`;
  let table = tables.get(id);
  if (!table) {
    table = new ValueTable(key);
    tables.set(id, table);
  }
  return table;
}

/** Number of shared tables currently held (for the cache-bound test). */
export const tableCount = (): number => tables.size;
