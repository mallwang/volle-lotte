import { createGame } from '../game.js';
import { seededRandomInt } from '../rng.js';
import { defaultRules } from '../types.js';
import type { CardType, GameState, Rules, Turn } from '../types.js';

const base = createGame(['a', 'b'], { ...defaultRules(), minimumPoints: 350 }, seededRandomInt(7));

/** A running two-player game in a given turn situation, for decision specs. */
export function situation(
  turn: Partial<Turn>,
  options: {
    rules?: Partial<Rules>;
    scores?: [number, number];
    cardCounts?: Partial<Record<CardType, number>>;
  } = {},
): GameState {
  const rules: Rules = {
    ...base.rules,
    ...options.rules,
    cardCounts: { ...base.rules.cardCounts, ...options.cardCounts },
  };
  const [a, b] = options.scores ?? [0, 0];
  return {
    ...base,
    rules,
    players: [
      { name: 'a', score: a },
      { name: 'b', score: b },
    ],
    turn: { ...(base.turn as Turn), phase: 'decide', card: 'bonus400', ...turn },
  };
}
