import type { GameView, SeatView } from 'game-rules';
import { MAX_TIMEOUTS, type GameRoom } from './game-room';

/** What one player may see: no deck, no password hash, no tokens, `random` difficulty stays `random`. */
export function toView(room: GameRoom, playerId: string): GameView {
  const seat = room.seatOf(playerId);
  const mine = room.seats[seat];
  const human = mine?.state === 'human' ? mine : undefined;
  const seats = room.seats.map((s): SeatView => {
    if (s.state === 'human') {
      return {
        state: 'human',
        playerId: s.playerId,
        nickname: s.nickname,
        connected: s.connected,
        ready: s.ready,
      };
    }
    if (s.state === 'computer') {
      const view: SeatView = { state: 'computer', difficulty: s.difficulty };
      if (s.former) view.former = { nickname: s.former.nickname };
      return view;
    }
    return { state: s.state };
  });
  const view: GameView = {
    id: room.id,
    name: room.name,
    phase: room.phase,
    rules: room.rules,
    hostId: room.hostId,
    you: { playerId, seat, timeoutWarning: human?.timeouts === MAX_TIMEOUTS - 1 },
    seats,
    fastComputerDice: room.fastComputerDice,
    computerSpeed: room.computerSpeed,
    log: room.log,
  };
  if (room.game) {
    const { deck, ...rest } = room.game;
    view.game = { ...rest, deckSize: deck.length };
    view.preview = room.preview;
    if (room.turnDeadline) view.turnDeadline = room.turnDeadline;
  }
  return view;
}
