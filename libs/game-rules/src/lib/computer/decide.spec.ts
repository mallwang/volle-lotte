import { chooseAction } from '../computer.js';
import type { Profile } from '../computer.js';
import { seededRandomInt } from '../rng.js';
import { scoreDice } from '../scoring.js';
import { legalActions } from '../game.js';
import type { Action } from '../types.js';
import { drawValue } from './cards.js';
import { drawProbability } from './decide.js';
import { situation } from './testing.js';
import { tableFor } from './value.js';
import { MEDIUM_MAX_REGRET } from './constants.js';
import { mediumIndex, chooseSelect } from './select.js';

const hard: Profile = { difficulty: 'hard', risk: 'medium' };
const rng = seededRandomInt(5);

/** Share of `draw` over many decisions. */
function drawShare(state: ReturnType<typeof situation>, profile: Profile, n = 2000): number {
  const r = seededRandomInt(11);
  let draws = 0;
  for (let i = 0; i < n; i++) if (chooseAction(state, profile, r).type === 'draw') draws++;
  return draws / n;
}

describe('bank or throw (hard, medium risk)', () => {
  it('banks three 4s with three dice left', () => {
    expect(chooseAction(situation({ run: 400, free: 3 }), hard, rng)).toEqual({ type: 'bank' });
  });

  it('banks four 1s (1,000 points) with two dice left', () => {
    expect(chooseAction(situation({ run: 1000, free: 2 }), hard, rng)).toEqual({ type: 'bank' });
  });

  it('throws on with many dice left', () => {
    expect(chooseAction(situation({ run: 400, free: 5 }), hard, rng)).toEqual({ type: 'throw' });
  });

  it('never banks below the minimum', () => {
    const state = situation({ run: 300, free: 1 });
    expect(chooseAction(state, hard, rng)).toEqual({ type: 'throw' });
  });

  it('works with minimum 0 and a very high minimum, with and without doubling', () => {
    for (const minimumPoints of [0, 5000]) {
      for (const fourOfAKindDoubling of [true, false]) {
        const state = situation(
          { run: 600, free: 3 },
          { rules: { minimumPoints, fourOfAKindDoubling } },
        );
        expect(legalActions(state)).toContainEqual(chooseAction(state, hard, rng));
      }
    }
  });

  it('lower risk banks earlier, higher risk throws longer', () => {
    const decide = (risk: Profile['risk']) =>
      chooseAction(situation({ run: 600, free: 4 }), { difficulty: 'hard', risk }, rng).type;
    expect(decide('none')).toBe('bank');
    expect(decide('high')).toBe('throw');
  });
});

describe('which dice (hard)', () => {
  const select = (dice: number[]) => {
    const state = situation({ phase: 'select', dice, free: dice.length, run: 0 });
    return { state, action: chooseAction(state, hard, rng) as Extract<Action, { type: 'select' }> };
  };

  it('takes a Volle Lotte when available', () => {
    expect(select([1, 1, 1, 5, 5, 5]).action.dice).toHaveLength(6);
  });

  it('chooses the pick with the best expected result, not a fixed pattern', () => {
    for (const dice of [
      [4, 4, 4, 1, 2, 3],
      [1, 1, 1, 5, 2, 3],
      [1, 1, 5, 2, 3, 6],
      [5, 5, 5, 1, 2, 6],
    ]) {
      const { state, action } = select(dice);
      const turn = state.turn!;
      const table = tableFor(state.rules, 'bonus', 0, 400, 0);
      const value = (a: Extract<Action, { type: 'select' }>) =>
        table.afterPick(turn.free, turn.run, {
          points: scoreDice(
            a.dice.map((i) => dice[i]),
            state.rules,
          ),
          dice: a.dice.length,
        });
      const best = Math.max(
        ...legalActions(state)
          .filter((a): a is Extract<Action, { type: 'select' }> => a.type === 'select')
          .map(value),
      );
      expect(value(action)).toBeCloseTo(best, 9);
    }
  });

  it('easy takes all scoring dice', () => {
    const state = situation({ phase: 'select', dice: [1, 5, 2, 3, 4, 6], free: 6, run: 0 });
    expect(chooseAction(state, { difficulty: 'easy', risk: 'medium' }, rng)).toEqual({
      type: 'select',
      dice: [0, 1],
    });
  });

  it('medium only overlooks close selections, never a clearly better continuation', () => {
    for (const dice of [
      [1, 1, 1, 5, 5, 5],
      [1, 1, 1, 5, 2, 3],
      [4, 4, 4, 1, 2, 3],
    ]) {
      const state = situation({ phase: 'select', dice, free: 6, run: 0 });
      const table = tableFor(state.rules, 'bonus', 0, 400, 0);
      const value = (a: Extract<Action, { type: 'select' }>) =>
        table.afterPick(6, 0, {
          points: scoreDice(
            a.dice.map((i) => dice[i]),
            state.rules,
          ),
          dice: a.dice.length,
        });
      const best = Math.max(
        ...legalActions(state)
          .filter((a): a is Extract<Action, { type: 'select' }> => a.type === 'select')
          .map(value),
      );
      for (let seed = 1; seed <= 100; seed++) {
        const action = chooseAction(
          state,
          { difficulty: 'medium', risk: 'medium' },
          seededRandomInt(seed),
        );
        if (action.type !== 'select') throw new Error('expected a selection');
        expect(best - value(action)).toBeLessThanOrEqual(MEDIUM_MAX_REGRET + 1e-9);
      }
    }
  });
});

describe('medium choices', () => {
  it('ignores clearly inferior options but still varies among close ones', () => {
    const random = seededRandomInt(14);
    const picked = new Set(Array.from({ length: 1000 }, () => mediumIndex([0, 300, 250], random)));
    expect(picked).toEqual(new Set([1, 2]));
  });

  it('does not weight equivalent dice subsets more than once', () => {
    const state = situation({ phase: 'select', dice: [1, 1, 1, 5, 2, 3], free: 6, run: 0 });
    const picks = legalActions(state).filter(
      (a): a is Extract<Action, { type: 'select' }> => a.type === 'select',
    );
    const duplicated = [...picks, ...Array.from({ length: 50 }, () => picks[0])];
    for (let seed = 1; seed <= 100; seed++) {
      expect(chooseSelect(state, duplicated, 'medium', 0, seededRandomInt(seed))).toEqual(
        chooseSelect(state, picks, 'medium', 0, seededRandomInt(seed)),
      );
    }
  });
});

describe('draw after a Volle Lotte on a Bonus card', () => {
  const vl = (carried: number, extra = {}) =>
    situation({ run: carried, free: 0, carried: 0, ...extra });

  it('risk none never draws', () => {
    for (const run of [400, 700, 3000, 6000]) {
      expect(drawShare(vl(run), { difficulty: 'hard', risk: 'none' }, 300)).toBe(0);
    }
  });

  it('risk medium draws about half of the time at indifference', () => {
    // find the stake where drawing and banking are equally good
    let lo = 500;
    let hi = 1500;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      const advantage = drawValue(vl(mid), mid, 0) - mid;
      if (advantage > 0) lo = mid;
      else hi = mid;
    }
    const stake = Math.round(lo / 50) * 50;
    const p = drawProbability(vl(stake), stake, 'medium', 0);
    expect(p).toBeGreaterThan(0.4);
    expect(p).toBeLessThan(0.6);
    const share = drawShare(vl(stake), { difficulty: 'hard', risk: 'medium' });
    expect(share).toBeGreaterThan(0.4);
    expect(share).toBeLessThan(0.6);
  });

  it('medium draws less with more Stop cards or more carried points', () => {
    const medium: Profile = { difficulty: 'hard', risk: 'medium' };
    const normal = drawShare(vl(800), medium);
    const manyStops = situation({ run: 800, free: 0, carried: 0 }, { cardCounts: { stop: 40 } });
    expect(drawShare(manyStops, medium)).toBeLessThan(normal);
    expect(drawShare(vl(1500), medium)).toBeLessThan(normal);
  });

  it('high draws clearly more than medium, and almost always in a normal situation', () => {
    const normal = vl(800);
    const high = drawShare(normal, { difficulty: 'hard', risk: 'high' });
    expect(high).toBeGreaterThan(0.85);
    expect(high).toBeGreaterThan(drawShare(normal, { difficulty: 'hard', risk: 'medium' }) + 0.2);
  });

  it('high draws noticeably less with very high carried points and many Stop and Plus/Minus cards', () => {
    const high: Profile = { difficulty: 'hard', risk: 'high' };
    const normal = drawShare(vl(800), high);
    const dangerous = situation(
      { run: 3000, free: 0 },
      { cardCounts: { stop: 30, plusMinus: 20 } },
    );
    expect(drawShare(dangerous, high)).toBeLessThan(normal - 0.3);
  });

  it('uses the card counts, not the real order of the draw pile', () => {
    const state = situation({ run: 900, free: 0 });
    const reversed = { ...state, deck: [...state.deck].reverse() };
    const stops = { ...state, deck: state.deck.map(() => 'stop' as const) };
    const a = chooseAction(state, hard, seededRandomInt(2));
    expect(chooseAction(reversed, hard, seededRandomInt(2))).toEqual(a);
    expect(chooseAction(stops, hard, seededRandomInt(2))).toEqual(a);
  });

  it('still chooses a legal action when the deck holds no Bonus card', () => {
    const state = situation(
      { run: 900, free: 0 },
      { cardCounts: { bonus200: 0, bonus300: 0, bonus400: 0, bonus500: 0, bonus600: 0 } },
    );
    expect(legalActions(state)).toContainEqual(chooseAction(state, hard, rng));
  });
});

describe('determinism', () => {
  it('makes the same decision with the same state and seed', () => {
    const state = situation({ run: 900, free: 0 });
    for (const profile of [hard, { difficulty: 'random', risk: 'random' } as Profile]) {
      for (let seed = 0; seed < 20; seed++) {
        expect(chooseAction(state, profile, seededRandomInt(seed))).toEqual(
          chooseAction(state, profile, seededRandomInt(seed)),
        );
      }
    }
  });
});
