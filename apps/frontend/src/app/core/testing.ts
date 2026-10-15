import { signal } from '@angular/core';
import type { GameView, SeatView } from 'game-rules';
import { defaultRules } from 'game-rules';

/** Test helpers (specs only). */
export function stubSocket(game: GameView | null = null) {
  return {
    session: signal({ playerId: 'p0', nickname: 'Ann' }),
    games: signal([]),
    game: signal(game),
    notice: signal<string | null>(null),
    storedNickname: '',
    send: vi.fn(),
    start: vi.fn(),
    create: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
  };
}

export function gameView(over: Partial<GameView> = {}, seats: SeatView[] = []): GameView {
  const open: SeatView = { state: 'open' };
  return {
    id: 'g1',
    name: 'Test',
    phase: 'lobby',
    rules: defaultRules(),
    hostId: 'p0',
    you: { playerId: 'p0', seat: 0 },
    seats: [...seats, ...Array.from({ length: 4 - seats.length }, () => open)],
    pending: [],
    graceEndsAt: {},
    log: [],
    ...over,
  };
}
