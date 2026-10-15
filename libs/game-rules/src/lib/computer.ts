import { legalActions } from './game.js';
import { scoreDice } from './scoring.js';
import type { Action, GameState, RandomInt } from './types.js';

export type ComputerLevel = 'easy' | 'medium' | 'hard';

type Select = Extract<Action, { type: 'select' }>;

// ponytail: initial numbers, calibrate by simulation later
const BANK_AT: Record<ComputerLevel, number> = { easy: 300, medium: 450, hard: 650 };
/** Never bank with this many free dice or more. */
const KEEP_THROWING_FROM: Record<ComputerLevel, number> = { easy: 7, medium: 5, hard: 4 };

/** Picks the candidate with the lowest `cost` (ties broken by `rng`). */
function pickBy<T>(items: readonly T[], cost: (item: T) => number, rng: RandomInt): T {
  const best = Math.min(...items.map(cost));
  const ties = items.filter((item) => cost(item) === best);
  return ties[rng(ties.length)];
}

function choose(state: GameState, level: ComputerLevel, rng: RandomInt, legal: Action[]): Action {
  const turn = state.turn;
  const find = (type: Action['type']) => legal.find((a) => a.type === type);
  if (!turn) return legal[0];
  if (turn.phase === 'select') {
    const picks = legal.filter((a): a is Select => a.type === 'select');
    const values = (a: Select) => a.dice.map((i) => turn.dice[i]);
    const points = (a: Select) => Math.max(0, scoreDice(values(a), state.rules));
    if (level === 'hard') {
      const all = picks.filter((a) => a.dice.length === turn.free);
      if (all.length > 0) return pickBy(all, (a) => -points(a), rng);
      return pickBy(picks, (a) => -points(a) / a.dice.length, rng);
    }
    return pickBy(picks, (a) => a.dice.length * 10000 + points(a), rng);
  }
  const total = turn.carried + turn.run;
  const wantBank = total >= BANK_AT[level] && turn.free < KEEP_THROWING_FROM[level];
  const bank = find('bank');
  if (bank && wantBank) return bank;
  return find('throw') ?? find('draw') ?? bank ?? legal[0];
}

/** Next action of a computer player; always one of `legalActions(state)`. Throws when the game is over. */
export function chooseAction(state: GameState, level: ComputerLevel, rng: RandomInt): Action {
  const legal = legalActions(state);
  if (legal.length === 0) throw new Error('no legal action');
  const action = choose(state, level, rng, legal);
  return legal.includes(action) ? action : legal[0];
}
