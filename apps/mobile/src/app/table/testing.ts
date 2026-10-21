import type { GameStateView, GameView, LogEntry, SeatView, Turn } from 'game-rules';
import { gameView } from '../core/testing';

export const human = (playerId: string, nickname = playerId): SeatView => ({
  state: 'human',
  playerId,
  nickname,
  connected: true,
});
export const computer = (name: string): SeatView => ({ state: 'computer', name });

const idle: Turn = {
  phase: 'draw',
  card: null,
  dice: [],
  free: 6,
  carried: 0,
  run: 0,
  street: [],
  volleLottes: 0,
};

/** A running game of the first `seats.length` seats; `current` is the engine index on turn. */
export function running(
  turn: Partial<Turn> = {},
  { current = 0, seats = [human('p0', 'Anna'), human('p1', 'Ben')], log = [] as LogEntry[] } = {},
  over: Partial<GameView> = {},
): GameView {
  const base = gameView();
  const game: GameStateView = {
    version: 1,
    players: seats.map((s, i) => ({ name: s.nickname ?? s.name ?? `P${i}`, score: 100 * i })),
    current,
    deckSize: 30,
    turn: { ...idle, ...turn },
    result: null,
  };
  return { ...base, phase: 'running', game, log, ...over, seats: gameView({}, seats).seats };
}
