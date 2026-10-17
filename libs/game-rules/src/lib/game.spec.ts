import { applyAction, createGame, legalActions, ranking, skipTurn } from './game.js';
import { scriptedRandomInt, seededRandomInt } from './rng.js';
import { defaultRules } from './types.js';
import type { Action, CardType, GameState } from './types.js';

const rules = defaultRules();
const rolls = (...faces: number[]) => scriptedRandomInt(faces.map((f) => f - 1));
const none = scriptedRandomInt([]);

const deepFreeze = <T>(o: T): T => {
  if (o && typeof o === 'object') Object.values(o).forEach(deepFreeze);
  return Object.freeze(o);
};

/** Game whose deck draws `cards` in order (top = last element). */
const rigged = (names: string[], cards: CardType[], over: Partial<GameState> = {}): GameState => ({
  ...createGame(names, rules, seededRandomInt(1)),
  deck: [...cards].reverse(),
  ...over,
});

const act = (state: GameState, action: Action, rng = none): GameState => {
  const out = applyAction(deepFreeze(state), action, rng);
  if (!out.ok) throw new Error(`rejected: ${out.reason}`);
  return out.state;
};

/** Plays a whole Bonus/Star-style Volle Lotte: draw, throw six scoring dice, select all. */
const volleLotte = (state: GameState) => {
  const s = act(state, { type: 'draw' });
  const t = act(s, { type: 'throw' }, rolls(1, 1, 1, 5, 5, 5));
  return act(t, { type: 'select', dice: [0, 1, 2, 3, 4, 5] });
};

describe('createGame', () => {
  it.each([2, 8])('accepts %i players', (n) => {
    const g = createGame(
      Array.from({ length: n }, (_, i) => `p${i}`),
      rules,
      seededRandomInt(1),
    );
    expect(g).toMatchObject({ current: 0, result: null, turn: { phase: 'draw' } });
    expect(g.deck).toHaveLength(56);
  });

  it.each([[['a']], [Array.from({ length: 9 }, (_, i) => `p${i}`)]])(
    'rejects the wrong player count',
    (names) => {
      expect(() => createGame(names, rules, seededRandomInt(1))).toThrow(RangeError);
    },
  );

  it('rejects invalid rules', () => {
    const bad = [
      { ...rules, targetScore: 0 },
      { ...rules, cardCounts: { ...rules.cardCounts, stop: -1 } },
      {
        ...rules,
        cardCounts: Object.fromEntries(
          Object.keys(rules.cardCounts).map((k) => [k, 0]),
        ) as typeof rules.cardCounts,
      },
    ];
    for (const r of bad)
      expect(() => createGame(['a', 'b'], r, seededRandomInt(1))).toThrow(RangeError);
  });
});

describe('turns', () => {
  // ported from Java SpielTest.playersTakeTurns: A, B, A
  it('players take turns and wrap around', () => {
    let g = rigged(['A', 'B'], ['stop', 'stop', 'stop']);
    expect(g.current).toBe(0);
    g = act(g, { type: 'draw' });
    expect(g.current).toBe(1);
    g = act(g, { type: 'draw' });
    expect(g.current).toBe(0);
  });

  it('banking credits the player and passes the turn', () => {
    let g = rigged(['A', 'B'], ['bonus200']);
    g = act(g, { type: 'draw' });
    g = act(g, { type: 'throw' }, rolls(1, 1, 1, 2, 3, 4));
    g = act(g, { type: 'select', dice: [0, 1, 2] });
    const out = applyAction(g, { type: 'bank' }, none);
    expect(out).toMatchObject({
      ok: true,
      state: { current: 1, players: [{ score: 1000 }, { score: 0 }] },
    });
    expect(out.ok && out.events).toContainEqual({ type: 'turnEnded', next: 1 });
  });

  it('draw after a Bonus Volle Lotte keeps the points for the next card; Stop loses them', () => {
    let g = rigged(['A', 'B'], ['bonus300', 'stop']);
    g = volleLotte(g);
    expect(g.turn).toMatchObject({ phase: 'decide', run: 1800 });
    g = act(g, { type: 'draw' });
    expect(g).toMatchObject({ current: 1, players: [{ score: 0 }, { score: 0 }] });
  });

  it('reshuffles an empty deck', () => {
    const out = applyAction(rigged(['A', 'B'], []), { type: 'draw' }, seededRandomInt(3));
    expect(out.ok && out.events).toContainEqual({ type: 'deckReshuffled' });
  });
});

const players = (...scores: number[]) => scores.map((score, i) => ({ name: `p${i}`, score }));
const allSix = { type: 'select', dice: [0, 1, 2, 3, 4, 5] } as const;
const throwSix = (g: GameState) =>
  act(act(g, { type: 'draw' }), { type: 'throw' }, rolls(1, 1, 1, 5, 5, 5));

describe('Plus/Minus', () => {
  it('gives +1000 and takes 1000 from every tied leader, never below 0', () => {
    const g = rigged(['A', 'B', 'C', 'D'], ['plusMinus'], { players: players(500, 700, 700, 300) });
    const out = applyAction(throwSix(g), allSix, none);
    expect(out.ok && out.state.players.map((p) => p.score)).toEqual([1500, 0, 0, 300]);
    expect(out.ok && out.events).toContainEqual({ type: 'penalty', player: 1, lost: 700 });
  });

  it('a leading player loses nothing', () => {
    const g = rigged(['A', 'B'], ['plusMinus'], { players: players(900, 400) });
    const out = applyAction(throwSix(g), allSix, none);
    expect(out.ok && out.state.players.map((p) => p.score)).toEqual([1900, 400]);
  });
});

describe('game end', () => {
  it('reaching the target score ends the game at once', () => {
    const g = rigged(['A', 'B', 'C'], ['bonus200'], { players: players(5500, 6000 - 1, 100) });
    const state = act(act(g, { type: 'draw' }), { type: 'throw' }, rolls(1, 1, 1, 2, 3, 4));
    const out = applyAction(
      act(state, { type: 'select', dice: [0, 1, 2] }),
      { type: 'bank' },
      none,
    );
    expect(out).toMatchObject({
      ok: true,
      state: { turn: null, result: { reason: 'targetScore', winner: 0 } },
    });
    expect(out.ok && out.state.result?.ranking).toEqual([
      { rank: 1, players: [0] },
      { rank: 2, players: [1] },
      { rank: 3, players: [2] },
    ]);
    expect(applyAction(out.ok ? out.state : g, { type: 'draw' }, none)).toEqual({
      ok: false,
      reason: 'gameOver',
    });
  });

  it('two new Volle Lotte with Clover win regardless of score', () => {
    const g = rigged(['A', 'B', 'C'], ['clover'], { players: players(0, 3000, 3000) });
    let s = act(throwSix(g), allSix);
    expect(s.turn).toMatchObject({ phase: 'throw', free: 6 });
    s = act(act(s, { type: 'throw' }, rolls(1, 1, 1, 5, 5, 5)), allSix);
    expect(s.turn).toBeNull();
    expect(s.result).toMatchObject({ reason: 'clover', winner: 0 });
    expect(s.result?.ranking).toEqual([
      { rank: 1, players: [0] },
      { rank: 2, players: [1, 2] },
    ]);
  });

  it('ranking shares ranks for equal scores', () => {
    expect(ranking({ players: players(100, 300, 300, 50) })).toEqual([
      { rank: 1, players: [1, 2] },
      { rank: 3, players: [0] },
      { rank: 4, players: [3] },
    ]);
  });
});

describe('atomicity', () => {
  it('a rejected action leaves the state untouched', () => {
    const g = deepFreeze(createGame(['A', 'B'], rules, seededRandomInt(1)));
    const copy = structuredClone(g);
    expect(applyAction(g, { type: 'throw' }, none)).toEqual({ ok: false, reason: 'wrongPhase' });
    expect(g).toEqual(copy);
  });
});

describe('legalActions', () => {
  it('lists exactly the accepted actions, including every select subset', () => {
    let g = rigged(['A', 'B'], ['bonus200']);
    expect(legalActions(g)).toEqual([{ type: 'draw' }]);
    g = act(act(g, { type: 'draw' }), { type: 'throw' }, rolls(1, 5, 2, 3, 4, 6));
    const legal = legalActions(g);
    expect(legal).toEqual([
      { type: 'select', dice: [0] },
      { type: 'select', dice: [1] },
      { type: 'select', dice: [0, 1] },
    ]);
    for (const a of legal) expect(applyAction(g, a, none).ok).toBe(true);
  });

  it('is empty when the game is over', () => {
    const g = rigged(['A', 'B'], [], {
      turn: null,
      result: { reason: 'clover', winner: 0, ranking: [] },
    });
    expect(legalActions(g)).toEqual([]);
  });
});

describe('skipTurn', () => {
  it('passes the turn without changing scores', () => {
    const state = createGame(['a', 'b'], rules, seededRandomInt(1));
    const next = skipTurn(state);
    expect(next.current).toBe(1);
    expect(next.turn?.phase).toBe('draw');
    expect(next.players).toEqual(state.players);
    expect(skipTurn(next).current).toBe(0);
  });

  it('leaves a finished game unchanged', () => {
    const state = { ...createGame(['a', 'b'], rules, seededRandomInt(1)), turn: null };
    expect(skipTurn(state)).toBe(state);
  });
});
