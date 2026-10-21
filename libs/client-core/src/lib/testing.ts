import { defaultRules, type GameView, type SeatView } from 'game-rules';

/** Test helper (specs only). */
export function gameView(over: Partial<GameView> = {}, seats: SeatView[] = []): GameView {
  const open: SeatView = { state: 'open' };
  return {
    id: 'g1',
    name: 'Test',
    phase: 'lobby',
    rules: defaultRules(),
    hostId: 'p0',
    you: { playerId: 'p0', seat: 0, timeoutWarning: false },
    round: 1,
    seats: [...seats, ...Array.from({ length: 4 - seats.length }, () => open)],
    fastComputerDice: false,
    computerSpeed: 3,
    showBustProbability: false,
    spectating: true,
    spectators: 0,
    paused: false,
    n: 0,
    logBase: 0,
    log: [],
    ...over,
  };
}
