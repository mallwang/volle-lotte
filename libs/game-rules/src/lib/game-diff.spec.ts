import { applyGameDiff, diffGame } from './game-diff.js';
import { applyAction, createGame } from './game.js';
import { scriptedRandomInt, seededRandomInt } from './rng.js';
import { replayViews, stateView } from './testing/replay.js';
import { defaultRules, type Action, type GameState } from './types.js';

const rules = { ...defaultRules(), targetScore: 6000, minimumPoints: 350 };
const rolls = (...faces: number[]) => scriptedRandomInt(faces.map((f) => f - 1));
const start = (n = 4): GameState =>
  createGame(
    Array.from({ length: n }, (_, i) => `P${i}`),
    rules,
    seededRandomInt(3),
  );

function step(state: GameState, action: Action, ...faces: number[]): GameState {
  const out = applyAction(state, action, rolls(...faces));
  if (!out.ok) throw new Error(out.reason);
  return out.state;
}

/** A state in which the current player is about to draw a known card. */
const withDeck = (state: GameState, ...deck: GameState['deck'][number][]): GameState => ({
  ...state,
  deck,
});

describe('diffGame / applyGameDiff', () => {
  const check = (prev: GameState, next: GameState) => {
    const a = stateView(prev);
    const b = stateView(next);
    const diff = diffGame(a, b);
    expect(diff).not.toBeNull();
    expect(diff).not.toBe('structural');
    const snapshot = structuredClone(a);
    expect(applyGameDiff(a, diff as never)).toEqual(b);
    expect(a).toEqual(snapshot);
    return diff;
  };

  it('a card draw: turn phase, card and free dice, pile size', () => {
    const s0 = withDeck(start(), 'bonus200', 'bonus200');
    const s1 = step(s0, { type: 'draw' });
    expect(check(s0, s1)).toEqual({
      turn: { phase: 'throw', card: 'bonus200', free: 6 },
      deckSize: 1,
    });
  });

  it('a throw: phase and dice', () => {
    const s1 = step(withDeck(start(), 'bonus200', 'bonus200'), { type: 'draw' });
    const s2 = step(s1, { type: 'throw' }, 1, 1, 2, 3, 5, 6);
    const diff = check(s1, s2) as { turn: Record<string, unknown> };
    expect(Object.keys(diff.turn).sort()).toEqual(['dice', 'phase']);
  });

  it('a selection: free dice and run', () => {
    const s1 = step(withDeck(start(), 'bonus200', 'bonus200'), { type: 'draw' });
    const s2 = step(s1, { type: 'throw' }, 1, 1, 2, 3, 5, 6);
    const s3 = step(s2, { type: 'select', dice: [0] });
    const diff = check(s2, s3) as { turn: Record<string, unknown> };
    expect(diff.turn).toHaveProperty('free');
    expect(diff.turn).toHaveProperty('run');
    expect(diff).not.toHaveProperty('players');
  });

  it('a bank: one score, the next player, a reset turn', () => {
    const s1 = step(withDeck(start(), 'bonus200', 'bonus200'), { type: 'draw' });
    const s2 = step(s1, { type: 'throw' }, 1, 1, 1, 5, 5, 6);
    const s3 = step(s2, { type: 'select', dice: [0, 1, 2] });
    const s4 = step(s3, { type: 'bank' });
    const diff = check(s3, s4) as { players: [number, { score: number }][]; current: number };
    expect(diff.players).toEqual([[0, { score: s4.players[0].score }]]);
    expect(diff.current).toBe(1);
  });

  it('a lost player name or score is listed by index only for the changed player', () => {
    const a = stateView(start());
    const b = {
      ...a,
      players: a.players.map((p, i) => (i === 2 ? { ...p, name: 'Bot' } : p)),
    };
    expect(diffGame(a, b)).toEqual({ players: [[2, { name: 'Bot' }]] });
    expect(applyGameDiff(a, diffGame(a, b) as never)).toEqual(b);
  });

  it('a turn that appears is sent whole, a turn that ends is null', () => {
    const a = stateView(start());
    const noTurn = { ...a, turn: null };
    expect(diffGame(noTurn, a)).toEqual({ turn: a.turn });
    expect(diffGame(a, noTurn)).toEqual({ turn: null });
    expect(applyGameDiff(noTurn, { turn: a.turn })).toEqual(a);
    expect(applyGameDiff(a, { turn: null })).toEqual(noTurn);
  });

  it('a result and a timeout reset', () => {
    const a = stateView(start());
    const result = {
      reason: 'targetScore' as const,
      winner: 0,
      ranking: [{ rank: 1, players: [0] }],
    };
    expect(diffGame(a, { ...a, result })).toEqual({ result });
    expect(applyGameDiff(a, { result })).toEqual({ ...a, result });
    expect(diffGame({ ...a, result }, a)).toEqual({ result: null });
  });

  it('is null when nothing differs, structural when the player count differs', () => {
    const a = stateView(start());
    expect(diffGame(a, structuredClone(a))).toBeNull();
    expect(diffGame(a, stateView(start(3)))).toBe('structural');
  });

  it('reproduces every step of seeded games with 2, 4 and 8 players', () => {
    for (const players of [2, 4, 8]) {
      const views = replayViews(players * 7, players);
      for (let i = 1; i < views.length; i++) {
        const prev = views[i - 1].game!;
        const next = views[i].game!;
        const diff = diffGame(prev, next);
        expect(diff === null ? prev : applyGameDiff(prev, diff as never)).toEqual(next);
      }
    }
  });
});
