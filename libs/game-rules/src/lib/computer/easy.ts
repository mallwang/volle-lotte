import type { Action, GameState, RandomInt } from '../types.js';
import { EASY_BANK_AT, EASY_DRAW_BELOW } from './constants.js';
import type { ConcreteRisk } from './profile.js';

export type Select = Extract<Action, { type: 'select' }>;

/** Picks the candidate with the lowest `cost` (ties broken by `rng`). */
export function pickBy<T>(items: readonly T[], cost: (item: T) => number, rng: RandomInt): T {
  const best = Math.min(...items.map(cost));
  const ties = items.filter((item) => cost(item) === best);
  return ties[rng(ties.length)];
}

/** Beginner rule of thumb: take every scoring die, preferring more points on ties. */
export function easySelect(
  picks: readonly Select[],
  points: (a: Select) => number,
  rng: RandomInt,
): Select {
  return pickBy(picks, (a) => -a.dice.length * 10000 - points(a), rng);
}

/** Rule of thumb: bank from a fixed amount of points on, whatever the dice left. */
export function easyBank(state: GameState, risk: ConcreteRisk): boolean {
  const turn = state.turn;
  return !!turn && turn.carried + turn.run >= EASY_BANK_AT[risk];
}

/** Rule of thumb after a Volle Lotte on a Bonus card: draw only while the total is small. */
export function easyDraw(state: GameState, risk: ConcreteRisk): boolean {
  const turn = state.turn;
  return !!turn && turn.carried + turn.run < EASY_DRAW_BELOW[risk];
}
