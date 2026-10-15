import type { GameView, SeatView } from 'game-rules';
import type { GameRoom } from './game-room';

/** What one player may see: no deck, no password hash, no tokens, `random` difficulty stays `random`. */
export function toView(room: GameRoom, playerId: string): GameView {
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
    if (s.state === 'computer') return { state: 'computer', difficulty: s.difficulty };
    return { state: s.state };
  });
  const graceEndsAt: Record<number, number> = {};
  room.seats.forEach((s, i) => {
    if (
      s.state === 'human' &&
      !s.connected &&
      s.disconnectedAt !== undefined &&
      !room.pending.has(i)
    ) {
      graceEndsAt[i] = s.disconnectedAt + room.graceMs;
    }
  });
  const view: GameView = {
    id: room.id,
    name: room.name,
    phase: room.phase,
    rules: room.rules,
    hostId: room.hostId,
    you: { playerId, seat: room.seatOf(playerId) },
    seats,
    pending: [...room.pending],
    graceEndsAt,
    log: room.log,
  };
  if (room.game) {
    const { deck, ...rest } = room.game;
    view.game = { ...rest, deckSize: deck.length };
  }
  return view;
}
