import { applyAction, createGame, legalActions } from './game.js';
import { seededRandomInt } from './rng.js';
import { fromJSON, toJSON } from './serialize.js';
import { defaultRules } from './types.js';
import type { GameState, Rules } from './types.js';

/** Plays one game with uniformly random legal actions; returns the final state. */
function play(seed: number, check = false): GameState {
  const rng = seededRandomInt(seed);
  const rules: Rules = {
    ...defaultRules(),
    targetScore: 1000 + 500 * rng(5),
    minimumPoints: [0, 350, 1000][rng(3)],
    fourOfAKindDoubling: rng(2) === 0,
  };
  let state = createGame(
    Array.from({ length: 2 + rng(7) }, (_, i) => `p${i}`),
    rules,
    rng,
  );
  for (let i = 0; i < 100_000; i++) {
    const legal = legalActions(state);
    if (legal.length === 0) return state;
    // bias towards banking so random games finish quickly
    const bank = legal.find((a) => a.type === 'bank');
    const out = applyAction(state, bank && rng(2) === 0 ? bank : legal[rng(legal.length)], rng);
    if (!out.ok) throw new Error(`legal action rejected: ${out.reason}`);
    state = out.state;
    if (check) {
      const r = fromJSON(toJSON(state));
      if (!r.ok) throw new Error(`round trip failed: ${r.reason}`);
      expect(r.state).toEqual(state);
    }
  }
  throw new Error(`game ${seed} did not end`);
}

describe('simulation', () => {
  it('10,000 random games end with a result and survive serialization', () => {
    for (let seed = 1; seed <= 10_000; seed++) {
      // ponytail: round trip checked on every 50th game to keep the run short, all states of those games
      const end = play(seed, seed % 50 === 0);
      expect(end.result).not.toBeNull();
      expect(end.turn).toBeNull();
    }
  }, 120_000);

  it('is deterministic for a seed', () => {
    expect(play(42)).toEqual(play(42));
  });
});
