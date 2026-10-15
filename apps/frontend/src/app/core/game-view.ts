import type { GameView, LogEntry, SeatView } from 'game-rules';

export const isHost = (g: GameView): boolean => g.hostId === g.you.playerId;

/** Seat numbers of the engine players (engine index = position among occupied seats). */
export function playerSeats(g: GameView): number[] {
  return g.seats.flatMap((s, i) => (s.state === 'human' || s.state === 'computer' ? [i] : []));
}

export const seatName = (s: SeatView | undefined): string => s?.nickname ?? 'Computer';

export function logText(g: GameView, e: LogEntry): string {
  const who = e.seat === undefined ? '' : seatName(g.seats[e.seat]);
  if (e.kind === 'turn' && typeof e.data === 'object') {
    const ev = e.data;
    switch (ev.type) {
      case 'cardDrawn':
        return `${who} drew ${ev.card}`;
      case 'thrown':
        return `${who} threw ${ev.dice.join(' ')}`;
      case 'selected':
        return `${who} set aside ${ev.points} points`;
      case 'volleLotte':
        return `${who} got a Volle Lotte`;
      case 'bust':
        return `${who} busted and lost ${ev.lost}`;
      case 'banked':
        return `${who} banked ${ev.points}`;
      case 'turnLost':
        return `${who} lost the turn (${ev.lost})`;
      case 'turnEnded':
        return `${who} ended the turn`;
      case 'deckReshuffled':
        return 'The deck was reshuffled';
      case 'penalty':
        return `${who} lost ${ev.lost} points`;
      case 'gameOver':
        return 'The game is over';
    }
  }
  const text: Record<string, string> = {
    joined: 'joined',
    left: 'left',
    disconnected: 'disconnected',
    reconnected: 'reconnected',
    hostChanged: 'is the new host',
    seatChanged: 'seat changed',
    started: 'The game started',
    turn: 'played',
    finished: 'The game finished',
    waitingForHost: 'Waiting for the host',
    hostDecided: 'The host decided',
  };
  return `${who} ${text[e.kind]}`.trim();
}
