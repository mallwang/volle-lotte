import { applyAction, createGame } from './game.js';
import { scriptedRandomInt, seededRandomInt } from './rng.js';
import { fromJSON, toJSON } from './serialize.js';
import { defaultRules } from './types.js';
import type { Action, CardType, GameState } from './types.js';

const rules = defaultRules();
const rolls = (...faces: number[]) => scriptedRandomInt(faces.map((f) => f - 1));
const start = (cards: CardType[]): GameState => ({
  ...createGame(['A', 'B'], rules, seededRandomInt(1)),
  deck: [...cards].reverse(),
});
const act = (s: GameState, a: Action, rng = rolls()) => {
  const out = applyAction(s, a, rng);
  if (!out.ok) throw new Error(out.reason);
  return out.state;
};
const roundTrip = (s: GameState) => {
  const r = fromJSON(JSON.parse(JSON.stringify(toJSON(s))));
  if (!r.ok) throw new Error(r.reason);
  return r.state;
};

describe('round trip', () => {
  it('restores states at every stage and replays identically', () => {
    const drawn = act(start(['street', 'clover']), { type: 'draw' });
    const thrown = act(drawn, { type: 'throw' }, rolls(1, 2, 2, 3, 4, 6));
    const partial = act(thrown, { type: 'select', dice: [0, 1, 3, 4, 5] });
    const clover = act(
      act(act(start(['clover']), { type: 'draw' }), { type: 'throw' }, rolls(1, 1, 1, 5, 5, 5)),
      {
        type: 'select',
        dice: [0, 1, 2, 3, 4, 5],
      },
    );
    for (const s of [start([]), drawn, thrown, partial, clover]) {
      expect(roundTrip(s)).toEqual(s);
    }
    expect(partial.turn).toMatchObject({ street: [1, 2, 3, 4, 6] });
    expect(clover.turn).toMatchObject({ volleLottes: 1 });
    // same scripted continuation from the restored state
    const next = (s: GameState) => act(s, { type: 'throw' }, rolls(5));
    expect(next(roundTrip(partial))).toEqual(next(partial));
  });

  it('restores a finished game', () => {
    const over: GameState = {
      ...start([]),
      turn: null,
      result: { reason: 'clover', winner: 0, ranking: [{ rank: 1, players: [0] }] },
    };
    expect(roundTrip(over)).toEqual(over);
  });
});

describe('rejects malformed data without throwing', () => {
  const good = () =>
    toJSON(
      act(act(start(['bonus200']), { type: 'draw' }), { type: 'throw' }, rolls(1, 2, 3, 4, 6, 6)),
    ) as Record<string, any>;
  const mutate = (f: (s: Record<string, any>) => void) => {
    const s = good();
    f(s);
    return s;
  };

  it.each([
    ['null', null],
    ['non-object', 'x'],
    ['array', []],
    ['wrong version', mutate((s) => (s.version = 2))],
    ['missing rules', mutate((s) => delete s.rules)],
    ['invalid rules', mutate((s) => (s.rules.targetScore = 0))],
    ['1 player', mutate((s) => (s.players = s.players.slice(0, 1)))],
    [
      '9 players',
      mutate((s) => (s.players = Array.from({ length: 9 }, () => ({ name: 'x', score: 0 })))),
    ],
    ['negative score', mutate((s) => (s.players[0].score = -1))],
    ['fractional score', mutate((s) => (s.players[0].score = 1.5))],
    ['current out of range', mutate((s) => (s.current = 2))],
    ['unknown deck card', mutate((s) => s.deck.push('joker'))],
    [
      'turn and result both set',
      mutate((s) => (s.result = { reason: 'clover', winner: 0, ranking: [] })),
    ],
    ['turn and result both null', mutate((s) => (s.turn = null))],
    ['bad result', mutate((s) => ((s.turn = null), (s.result = { reason: 'x' })))],
    ['street duplicates', mutate((s) => (s.turn.street = [1, 1]))],
    ['street out of range', mutate((s) => (s.turn.street = [7]))],
    ['card null outside draw', mutate((s) => (s.turn.card = null))],
    ['card set in draw', mutate((s) => (s.turn.phase = 'draw'))],
    ['dice length differs from free', mutate((s) => s.turn.dice.pop())],
    ['unknown phase', mutate((s) => (s.turn.phase = 'x'))],
    ['negative run', mutate((s) => (s.turn.run = -5))],
  ])('%s', (_name, data) => {
    expect(fromJSON(data)).toMatchObject({ ok: false });
  });

  it('accepts the unmodified state', () => {
    expect(fromJSON(good()).ok).toBe(true);
  });
});
