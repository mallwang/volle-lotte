import { applyAction, createGame, legalActions } from '../game.js';
import type { GameStateView, GameView, LogEntry } from '../protocol.js';
import { seededRandomInt } from '../rng.js';
import { defaultRules, type Event, type GameState } from '../types.js';

export const stateView = (state: GameState): GameStateView => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { deck, rules: _rules, ...rest } = state;
  return { ...rest, deckSize: deck.length };
};

/** A running view around an engine state; the log is whatever the caller passes. */
export function viewOf(
  state: GameState,
  log: LogEntry[] = [],
  over: Partial<GameView> = {},
): GameView {
  const seats = state.players.map((p, i) => ({
    state: 'human' as const,
    playerId: `p${i}`,
    nickname: p.name,
    connected: true,
    ready: true,
  }));
  return {
    id: 'abc',
    name: 'Table',
    phase: state.result ? 'finished' : 'running',
    rules: state.rules,
    hostId: 'p0',
    you: { playerId: 'p0', seat: 0, timeoutWarning: false },
    round: 1,
    seats,
    game: stateView(state),
    fastComputerDice: false,
    computerSpeed: 3,
    showBustProbability: false,
    spectating: true,
    spectators: 0,
    paused: false,
    n: 0,
    logBase: 0,
    log,
    ...over,
  };
}

/** The log entries a room writes for the events of one action. */
export const logOf = (state: GameState, events: readonly Event[], at: number): LogEntry[] =>
  events.map((data) => ({ at, kind: 'turn' as const, seat: state.current, data }));

/**
 * Plays a seeded random game and returns the whole sequence of views, one per accepted action
 * (the first is the start), with the log growing like a room's log.
 */
export function replayViews(
  seed: number,
  players: number,
  /** Give every running state a turn limit that starts anew with each action. */
  deadlines = false,
): GameView[] {
  const rng = seededRandomInt(seed);
  const rules = { ...defaultRules(), targetScore: 1500 };
  let state = createGame(
    Array.from({ length: players }, (_, i) => `p${i}`),
    rules,
    rng,
  );
  const log: LogEntry[] = [];
  const withLimit = (v: GameView, i: number): GameView =>
    deadlines && v.game?.turn
      ? { ...v, turnDeadline: { at: 5000 + i, phase: v.game.turn.phase } }
      : v;
  const views = [withLimit(viewOf(state, [...log]), 0)];
  for (let i = 0; i < 100_000; i++) {
    const legal = legalActions(state);
    if (legal.length === 0) return views;
    const bank = legal.find((a) => a.type === 'bank');
    const out = applyAction(state, bank && rng(2) === 0 ? bank : legal[rng(legal.length)], rng);
    if (!out.ok) throw new Error(`legal action rejected: ${out.reason}`);
    log.push(...logOf(state, out.events, 1000 + i));
    state = out.state;
    views.push(withLimit(viewOf(state, [...log]), i + 1));
  }
  throw new Error(`game ${seed} did not end`);
}
