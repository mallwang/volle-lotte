import { scriptedRandomInt } from './rng.js';
import { applyCard, newTurn, step } from './turn.js';
import type { StepResult } from './turn.js';
import { defaultRules } from './types.js';
import type { Action, CardType, Rules, Turn } from './types.js';

const rules = defaultRules();
/** Dice faces the next throws will show (one face per die). */
const rolls = (...faces: number[]) => scriptedRandomInt(faces.map((f) => f - 1));
const noRng = scriptedRandomInt([]);

function ok(result: StepResult) {
  if (!result.ok) throw new Error(`rejected: ${result.reason}`);
  return result;
}
const turnOf = (card: CardType, over: Partial<Turn> = {}): Turn => ({
  ...(ok(applyCard(newTurn(), card)).turn as Turn),
  ...over,
});
const run = (turn: Turn | null, action: Action, rng = noRng, r: Rules = rules) =>
  ok(step(r, turn as Turn, action, rng));
const select = (...dice: number[]): Action => ({ type: 'select', dice });
const reason = (turn: Turn, action: Action, rng = noRng, r: Rules = rules) => {
  const result = step(r, turn, action, rng);
  return result.ok ? 'accepted' : result.reason;
};

/** Throws `faces` and selects `picks`. */
const throwAndSelect = (turn: Turn | null, faces: number[], picks: number[], r: Rules = rules) =>
  run(run(turn, { type: 'throw' }, rolls(...faces), r).turn, select(...picks), noRng, r);

// ported from Java RundeTest
describe('basic turn (Java RundeTest)', () => {
  it('Bonus 300: bonus is added on Volle Lotte, then bank', () => {
    const first = throwAndSelect(turnOf('bonus300'), [1, 1, 1, 5, 5, 5], [0, 1, 2]);
    expect(first.turn).toMatchObject({ phase: 'decide', run: 1000, free: 3 });
    const second = throwAndSelect(first.turn, [5, 5, 5], [0, 1, 2]);
    expect(second.turn).toMatchObject({ phase: 'decide', run: 1800, free: 0 });
    expect(second.events).toContainEqual({ type: 'volleLotte' });
    const banked = run(second.turn, { type: 'bank' });
    expect(banked).toMatchObject({ turn: null, credit: 1800 });
  });

  it('Bonus 600: selecting only the ones leaves 3 free dice and no bonus', () => {
    const r = throwAndSelect(turnOf('bonus600'), [1, 1, 1, 2, 3, 4], [0, 1, 2]);
    expect(r.turn).toMatchObject({ phase: 'decide', run: 1000, free: 3 });
  });

  it('Bonus 200: partial selection allows throwing but not banking below the minimum', () => {
    const r = throwAndSelect(turnOf('bonus200'), [1, 2, 3, 4, 6, 6], [0]);
    expect(r.turn).toMatchObject({ phase: 'decide', run: 100, free: 5 });
    expect(reason(r.turn as Turn, { type: 'bank' })).toBe('belowMinimum');
    expect(reason(r.turn as Turn, { type: 'throw' }, rolls(1, 1, 1, 1, 1))).toBe('accepted');
  });

  it('a non-scoring die cannot be selected', () => {
    const t = run(turnOf('bonus200'), { type: 'throw' }, rolls(1, 2, 3, 4, 6, 6)).turn as Turn;
    expect(reason(t, select(1))).toBe('nonScoringDie');
    expect(reason(t, select(0, 1))).toBe('nonScoringDie');
  });

  it('a throw without a scoring die is a bust and loses the turn', () => {
    const r = run(turnOf('bonus200'), { type: 'throw' }, rolls(2, 3, 4, 6, 2, 4));
    expect(r).toMatchObject({ turn: null, credit: 0 });
    expect(r.events).toContainEqual({ type: 'bust', lost: 0 });
  });
});

describe('basic turn (spec user story 2)', () => {
  it('rejects empty, out-of-range, fractional and duplicate selections', () => {
    const t = run(turnOf('bonus200'), { type: 'throw' }, rolls(1, 1, 5, 2, 3, 4)).turn as Turn;
    expect(reason(t, select())).toBe('emptySelection');
    expect(reason(t, select(6))).toBe('invalidIndex');
    expect(reason(t, select(-1))).toBe('invalidIndex');
    expect(reason(t, select(0.5))).toBe('invalidIndex');
    expect(reason(t, select(0, 0))).toBe('duplicateIndex');
  });

  it('partial selection then throw rolls only the free dice and keeps the points', () => {
    const r = throwAndSelect(turnOf('bonus200'), [1, 5, 2, 3, 4, 6], [0, 1]);
    expect(r.turn).toMatchObject({ run: 150, free: 4 });
    const t = run(r.turn, { type: 'throw' }, rolls(1, 2, 3, 4));
    expect(t.turn).toMatchObject({ phase: 'select', dice: [1, 2, 3, 4], run: 150 });
  });

  it('bust loses the points collected so far', () => {
    const r = throwAndSelect(turnOf('bonus200'), [1, 1, 1, 2, 3, 4], [0, 1, 2]);
    const bust = run(r.turn, { type: 'throw' }, rolls(2, 3, 4));
    expect(bust).toMatchObject({ turn: null, credit: 0 });
    expect(bust.events).toContainEqual({ type: 'bust', lost: 1000 });
  });

  it('bank needs the minimum: 99 of 100 rejected, 100 accepted, minimum 0 accepts anything', () => {
    const decided = turnOf('bonus200', { phase: 'decide', free: 5, run: 100 });
    expect(reason(decided, { type: 'bank' }, noRng, { ...rules, minimumPoints: 101 })).toBe(
      'belowMinimum',
    );
    expect(run(decided, { type: 'bank' }, noRng, { ...rules, minimumPoints: 100 }).credit).toBe(
      100,
    );
    expect(run(decided, { type: 'bank' }, noRng, { ...rules, minimumPoints: 0 }).credit).toBe(100);
  });

  it('nothing to bank before the first selection', () => {
    expect(reason(turnOf('bonus200'), { type: 'bank' })).toBe('nothingToBank');
  });

  it('Volle Lotte on a card without effect refreshes nothing but the bonus; six fresh dice come from drawing', () => {
    const r = throwAndSelect(turnOf('bonus300'), [1, 1, 1, 5, 5, 5], [0, 1, 2, 3, 4, 5]);
    expect(r.turn).toMatchObject({ phase: 'decide', free: 0, run: 1800 });
    expect(reason(r.turn as Turn, { type: 'throw' })).toBe('wrongPhase');
  });

  it('wrong phase is rejected', () => {
    const t = turnOf('bonus200');
    expect(reason(t, select(0))).toBe('wrongPhase');
    expect(reason(t, { type: 'draw' })).toBe('wrongPhase');
    const selecting = run(t, { type: 'throw' }, rolls(1, 2, 3, 4, 6, 6)).turn as Turn;
    expect(reason(selecting, { type: 'throw' })).toBe('wrongPhase');
    expect(reason(selecting, { type: 'bank' })).toBe('wrongPhase');
  });
});

describe('cards', () => {
  const allSix = [1, 1, 1, 5, 5, 5];

  it('Bonus: draw after a Volle Lotte keeps the points in `carried`', () => {
    const vl = throwAndSelect(turnOf('bonus300'), allSix, [0, 1, 2, 3, 4, 5]);
    const drawn = run(vl.turn, { type: 'draw' }).turn as Turn;
    expect(drawn).toMatchObject({ phase: 'draw', card: null, carried: 1800, run: 0 });
  });

  it('Stop ends the turn; after a Volle Lotte it credits the carried points', () => {
    expect(applyCard(newTurn(), 'stop')).toMatchObject({ turn: null, credit: 0 });
    expect(applyCard({ ...newTurn(), carried: 700 }, 'stop')).toMatchObject({
      turn: null,
      credit: 700,
    });
  });

  describe('Double Lotte', () => {
    it('doubles only the run, earlier points count once', () => {
      const r = throwAndSelect(turnOf('doubleLotte', { carried: 500 }), allSix, [0, 1, 2, 3, 4, 5]);
      expect(r).toMatchObject({ turn: null, credit: 500 + 3000 });
    });

    it('loses the turn when the doubled value stays below the minimum', () => {
      const strict = { ...rules, minimumPoints: 4000 };
      const r = throwAndSelect(turnOf('doubleLotte'), allSix, [0, 1, 2, 3, 4, 5], strict);
      expect(r).toMatchObject({ turn: null, credit: 0 });
      expect(r.events).toContainEqual({ type: 'turnLost', lost: 1500 });
    });

    it('chained: banking is not allowed, the Volle Lotte must succeed', () => {
      const t = turnOf('doubleLotte', { phase: 'decide', free: 3, run: 500, carried: 500 });
      expect(reason(t, { type: 'bank' })).toBe('wrongPhase');
      expect(run(t, { type: 'throw' }, rolls(2, 3, 4))).toMatchObject({ turn: null, credit: 0 });
    });
  });

  describe('Star', () => {
    it('may select just some of the scoring dice', () => {
      const t = run(turnOf('star'), { type: 'throw' }, rolls(1, 5, 2, 3, 4, 6)).turn as Turn;
      expect(reason(t, select(0))).toBe('accepted');
      expect(reason(t, select(0, 1))).toBe('accepted');
    });

    it('a bust credits all points of the turn', () => {
      const t = turnOf('star', { phase: 'decide', free: 3, run: 300, carried: 200 });
      expect(run(t, { type: 'throw' }, rolls(2, 3, 4))).toMatchObject({ turn: null, credit: 500 });
    });

    it('bank is never allowed', () => {
      const t = turnOf('star', { phase: 'decide', free: 3, run: 600 });
      expect(reason(t, { type: 'bank' })).toBe('wrongPhase');
    });

    it('a Volle Lotte credits everything, even below the minimum', () => {
      const r = throwAndSelect(turnOf('star'), allSix, [0, 1, 2, 3, 4, 5]);
      expect(r).toMatchObject({ turn: null, credit: 1500 });
      const low = throwAndSelect(turnOf('star'), allSix, [0, 1, 2, 3, 4, 5], {
        ...rules,
        minimumPoints: 5000,
      });
      expect(low.credit).toBe(1500);
    });
  });

  describe('Street', () => {
    it('collects values cumulatively and rejects values already held or repeated', () => {
      const t = run(turnOf('street'), { type: 'throw' }, rolls(1, 2, 2, 3, 4, 6)).turn as Turn;
      expect(reason(t, select(1, 2))).toBe('nonScoringDie');
      const r = run(t, select(0, 1, 3, 4, 5));
      expect(r.turn).toMatchObject({ phase: 'decide', free: 1, street: [1, 2, 3, 4, 6] });
      expect(reason(r.turn as Turn, { type: 'bank' })).toBe('wrongPhase');
    });

    it('a throw without a missing value busts and loses carried points too', () => {
      const t = turnOf('street', {
        phase: 'decide',
        free: 1,
        street: [1, 2, 3, 4, 6],
        carried: 800,
      });
      expect(run(t, { type: 'throw' }, rolls(3))).toMatchObject({ turn: null, credit: 0 });
    });

    it('success credits exactly 2000, replacing the points held (2300 -> 2000)', () => {
      const t = turnOf('street', {
        phase: 'decide',
        free: 1,
        street: [1, 2, 3, 4, 6],
        carried: 2300,
      });
      expect(throwAndSelect(t, [5], [0])).toMatchObject({ turn: null, credit: 2000 });
    });
  });

  it('Plus/Minus: Volle Lotte asks the game for the effect, bust gives nothing', () => {
    const r = throwAndSelect(turnOf('plusMinus'), allSix, [0, 1, 2, 3, 4, 5]);
    expect(r).toMatchObject({ turn: null, credit: 0, effect: 'plusMinus' });
    const bust = run(turnOf('plusMinus'), { type: 'throw' }, rolls(2, 3, 4, 6, 2, 4));
    expect(bust).toMatchObject({ turn: null, credit: 0 });
    expect(bust.effect).toBeUndefined();
  });

  describe('Clover', () => {
    it('two new Volle Lotte win; the first keeps the run and gives six fresh dice', () => {
      const first = throwAndSelect(turnOf('clover'), allSix, [0, 1, 2, 3, 4, 5]);
      expect(first.turn).toMatchObject({ phase: 'throw', free: 6, volleLottes: 1, run: 1500 });
      const second = throwAndSelect(first.turn, allSix, [0, 1, 2, 3, 4, 5]);
      expect(second).toMatchObject({ turn: null, effect: 'cloverWin' });
    });

    it('a bust loses everything without winning', () => {
      const t = turnOf('clover', { volleLottes: 1, run: 1500 });
      const r = run(t, { type: 'throw' }, rolls(2, 3, 4, 6, 2, 4));
      expect(r).toMatchObject({ turn: null, credit: 0 });
      expect(r.effect).toBeUndefined();
    });

    it('chained: banking is not allowed', () => {
      const t = turnOf('clover', { phase: 'decide', free: 3, run: 500, carried: 500 });
      expect(reason(t, { type: 'bank' })).toBe('wrongPhase');
    });
  });

  describe('Bonus chain', () => {
    const chained = () => turnOf('bonus200', { carried: 1800 });

    it('the next Bonus needs the minimum in its own run before banking', () => {
      expect(reason(chained(), { type: 'bank' })).toBe('nothingToBank');
      const low = throwAndSelect(chained(), [1, 2, 3, 4, 6, 6], [0]);
      expect(reason(low.turn as Turn, { type: 'bank' })).toBe('belowMinimum');
    });

    it('success adds all turn points', () => {
      const r = throwAndSelect(chained(), [5, 5, 5, 2, 3, 4], [0, 1, 2]);
      expect(run(r.turn, { type: 'bank' })).toMatchObject({ turn: null, credit: 1800 + 500 });
    });

    it('a bust loses the whole turn', () => {
      const r = run(chained(), { type: 'throw' }, rolls(2, 3, 4, 6, 2, 4));
      expect(r).toMatchObject({ turn: null, credit: 0 });
      expect(r.events).toContainEqual({ type: 'bust', lost: 1800 });
    });
  });
});
