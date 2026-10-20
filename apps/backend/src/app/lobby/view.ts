import type { GameStateView, GameView, SeatView } from 'game-rules';
import { MAX_TIMEOUTS, type GameRoom, type Seat } from './game-room';

function seatViews(seats: readonly Seat[]): SeatView[] {
  return seats.map((s): SeatView => {
    if (s.state === 'human') {
      return {
        state: 'human',
        playerId: s.playerId,
        nickname: s.nickname,
        connected: s.connected,
        ready: s.ready,
      };
    }
    if (s.state === 'reserved') return { state: 'reserved', nickname: s.nickname };
    if (s.state === 'computer') {
      const view: SeatView = {
        state: 'computer',
        name: s.name,
        difficulty: s.difficulty,
        risk: s.risk,
      };
      if (s.former) view.former = { nickname: s.former.nickname };
      return view;
    }
    return { state: s.state };
  });
}

const withoutDeck = (game: NonNullable<GameRoom['game']>): GameStateView => {
  // the rules travel once, in `GameView.rules`
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { deck, rules: _rules, ...rest } = game;
  return { ...rest, deckSize: deck.length };
};

/**
 * What a player who waits for the rematch sees: the finished game as it was, with their seat of
 * that game, so the table and ranking behind the game-over modal stay as they were.
 */
function waitingView(room: GameRoom, playerId: string): GameView | undefined {
  const archive = room.archive;
  if (!archive) return undefined;
  const reserved = room.reservedSeat(playerId);
  if (reserved < 0 && !room.dropped.has(playerId)) return undefined;
  const seat = archive.seats.findIndex((s) => s.state === 'human' && s.playerId === playerId);
  return {
    id: room.id,
    name: room.name,
    phase: 'finished',
    rules: room.rules,
    hostId: archive.hostId,
    you: {
      playerId,
      seat,
      timeoutWarning: false,
      ...(reserved >= 0 && { reserved }),
    },
    round: archive.round,
    rematch: reserved >= 0 ? 'open' : 'closed',
    seats: seatViews(archive.seats),
    game: withoutDeck(archive.game),
    fastComputerDice: room.fastComputerDice,
    computerSpeed: room.computerSpeed,
    showBustProbability: room.showBustProbability,
    spectating: room.spectating,
    spectators: room.spectators.size,
    paused: false,
    n: 0,
    logBase: archive.logBase,
    log: archive.log,
  };
}

/** What one player may see: no deck, no password hash, no tokens, `random` skill and risk stay `random`. */
export function toView(room: GameRoom, playerId: string): GameView {
  const waiting = waitingView(room, playerId);
  if (waiting) return waiting;
  const seat = room.seatOf(playerId);
  const mine = room.seats[seat];
  const human = mine?.state === 'human' ? mine : undefined;
  const view: GameView = {
    id: room.id,
    name: room.name,
    phase: room.phase,
    rules: room.rules,
    hostId: room.hostId,
    you: room.spectators.has(playerId)
      ? { playerId, seat: -1, timeoutWarning: false, spectator: true }
      : { playerId, seat, timeoutWarning: human?.timeouts === MAX_TIMEOUTS - 1 },
    round: room.round,
    seats: seatViews(room.seats),
    fastComputerDice: room.fastComputerDice,
    computerSpeed: room.computerSpeed,
    showBustProbability: room.showBustProbability,
    spectating: room.spectating,
    spectators: room.spectators.size,
    paused: room.paused,
    n: 0,
    logBase: room.logBase,
    log: room.log,
  };
  if (room.game) {
    view.game = withoutDeck(room.game);
    view.preview = room.preview;
    if (room.turnDeadline) view.turnDeadline = room.turnDeadline;
  }
  return view;
}
