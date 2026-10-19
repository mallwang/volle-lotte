import { chooseAction, warmUp } from './computer.js';
import type { Profile } from './computer.js';
import { applyAction, createGame, legalActions } from './game.js';
import { seededRandomInt } from './rng.js';
import { defaultRules } from './types.js';
import { situation } from './computer/testing.js';

const profiles: Profile[] = [
  { difficulty: 'easy', risk: 'medium' },
  { difficulty: 'medium', risk: 'none' },
  { difficulty: 'hard', risk: 'high' },
  { difficulty: 'random', risk: 'random' },
];
const rng = seededRandomInt(1);
const base = createGame(['a', 'b'], { ...defaultRules(), minimumPoints: 0 }, seededRandomInt(7));

describe('chooseAction', () => {
  it.each([
    [
      [1, 5, 2, 3, 4, 6],
      [0, 1],
    ],
    [
      [1, 5, 2, 2, 2, 6],
      [0, 1, 2, 3, 4],
    ],
    [
      [1, 1, 1, 5, 5, 5],
      [0, 1, 2, 3, 4, 5],
    ],
    [[1, 2, 2, 3, 4, 6], [0]],
  ])('easy takes all scoring dice from %j', (dice, picks) => {
    const state = situation({ phase: 'select', dice, free: 6, run: 0 });
    for (let seed = 1; seed <= 10; seed++) {
      expect(chooseAction(state, profiles[0], seededRandomInt(seed))).toEqual({
        type: 'select',
        dice: picks,
      });
    }
  });

  it('always returns a legal action and finishes whole games', () => {
    for (const profile of profiles) {
      for (let seed = 1; seed <= 10; seed++) {
        const r = seededRandomInt(seed);
        let state = createGame(['a', 'b', 'c'], { ...defaultRules(), targetScore: 2000 }, r);
        for (let i = 0; i < 20_000 && !state.result; i++) {
          const action = chooseAction(state, profile, r);
          expect(legalActions(state)).toContainEqual(action);
          const out = applyAction(state, action, r);
          if (!out.ok) throw new Error(out.reason);
          state = out.state;
        }
        expect(state.result).not.toBeNull();
      }
    }
  });

  it('throws when the game is over', () => {
    expect(() => chooseAction({ ...base, turn: null }, profiles[0], rng)).toThrow();
  });

  it('draws at the start of a turn', () => {
    expect(chooseAction(base, profiles[2], rng)).toEqual({ type: 'draw' });
  });

  it('warms up the shared tables without error', () => {
    expect(() => warmUp(defaultRules())).not.toThrow();
  });
});
