import { chooseAction } from './computer.js';
import type { ComputerLevel } from './computer.js';
import { applyAction, createGame, legalActions } from './game.js';
import { seededRandomInt } from './rng.js';
import { defaultRules } from './types.js';
import type { GameState, Turn } from './types.js';

const levels: ComputerLevel[] = ['easy', 'medium', 'hard'];
const rng = seededRandomInt(1);

const base = createGame(['a', 'b'], { ...defaultRules(), minimumPoints: 0 }, seededRandomInt(7));
const baseTurn = base.turn as Turn;
const withTurn = (over: Partial<Turn>): GameState => ({
  ...base,
  turn: { ...baseTurn, phase: 'decide', card: 'bonus200', ...over },
});
const decide = (level: ComputerLevel, run: number, free: number) =>
  chooseAction(withTurn({ run, free }), level, rng).type;

describe('chooseAction', () => {
  it('always returns a legal action and finishes whole games', () => {
    for (const level of levels) {
      for (let seed = 1; seed <= 20; seed++) {
        const r = seededRandomInt(seed);
        let state = createGame(['a', 'b', 'c'], { ...defaultRules(), targetScore: 2000 }, r);
        for (let i = 0; i < 20_000 && !state.result; i++) {
          const action = chooseAction(state, level, r);
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
    expect(() => chooseAction({ ...base, turn: null }, 'easy', rng)).toThrow();
  });

  it('draws at the start of a turn', () => {
    expect(chooseAction(base, 'hard', rng)).toEqual({ type: 'draw' });
  });

  it('bank thresholds per difficulty', () => {
    expect(decide('easy', 250, 3)).toBe('throw');
    expect(decide('easy', 300, 3)).toBe('bank');
    expect(decide('easy', 300, 6)).toBe('bank');
    expect(decide('medium', 400, 3)).toBe('throw');
    expect(decide('medium', 450, 4)).toBe('bank');
    expect(decide('medium', 1000, 5)).toBe('throw');
    expect(decide('hard', 600, 2)).toBe('throw');
    expect(decide('hard', 650, 3)).toBe('bank');
    expect(decide('hard', 2000, 4)).toBe('throw');
  });

  it('never banks below the minimum, even at the threshold', () => {
    const state = withTurn({ run: 300, free: 3 });
    const strict = { ...state, rules: { ...state.rules, minimumPoints: 1000 } };
    expect(chooseAction(strict, 'easy', rng)).toEqual({ type: 'throw' });
  });

  it('draws the next card after a Bonus Volle Lotte below the threshold, banks above', () => {
    expect(decide('hard', 400, 0)).toBe('draw');
    expect(decide('hard', 800, 0)).toBe('bank');
  });

  const select = (level: ComputerLevel, dice: number[], free = dice.length) =>
    chooseAction(withTurn({ phase: 'select', dice, free }), level, rng);

  it('easy and medium keep the most dice free', () => {
    for (const level of ['easy', 'medium'] as const)
      expect(select(level, [1, 5, 2, 3, 4, 6])).toEqual({ type: 'select', dice: [1] });
  });

  it('hard takes a Volle Lotte when available', () => {
    expect(select('hard', [1, 1, 1, 5, 5, 5])).toEqual({
      type: 'select',
      dice: [0, 1, 2, 3, 4, 5],
    });
  });

  it('hard prefers the best points per die otherwise', () => {
    expect(select('hard', [1, 5, 2, 3, 4, 6])).toEqual({ type: 'select', dice: [0] });
  });
});
