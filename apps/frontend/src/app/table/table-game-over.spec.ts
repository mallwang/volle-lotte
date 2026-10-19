import { TestBed } from '@angular/core/testing';
import { defaultRules, type GameStateView, type GameView, type SeatView } from 'game-rules';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { Celebration } from '../core/celebration';
import { LeaveGame } from '../core/leave-game';
import { SocketService } from '../core/socket.service';
import { gameView, stubSocket } from '../core/testing';
import { Table } from './table';

const human = (id: string, name: string): SeatView => ({
  state: 'human',
  playerId: id,
  nickname: name,
  connected: true,
});

const result = {
  reason: 'targetScore',
  winner: 0,
  ranking: [
    { rank: 1, players: [0] },
    { rank: 2, players: [1, 2] },
  ],
} as const;

const engine = (over: Partial<GameStateView> = {}): GameStateView => ({
  version: 1,
  rules: defaultRules(),
  players: [
    { name: 'Ann', score: 10_100 },
    { name: 'Bob', score: 6000 },
    { name: 'Cy', score: 6000 },
  ],
  current: 0,
  deckSize: 30,
  turn: null,
  result,
  ...over,
});

const seats = [human('p0', 'Ann'), human('p1', 'Bob'), human('p2', 'Cy')];
const endLog = [
  { at: 1, kind: 'turn', seat: 0, data: { type: 'gameOver', result } },
  { at: 2, kind: 'finished' },
];

const finished = (over: Partial<GameView> = {}) =>
  gameView({ phase: 'finished', game: engine(), log: endLog as never, ...over }, seats);

async function setup(game: GameView) {
  const socket = stubSocket(game);
  const celebration = { preload: vi.fn(), start: vi.fn(), stop: vi.fn() };
  TestBed.configureTestingModule({
    imports: [Table],
    providers: [
      providePrimeNG(),
      MessageService,
      { provide: SocketService, useValue: socket },
      { provide: LeaveGame, useValue: { request: vi.fn() } },
      { provide: Celebration, useValue: celebration },
    ],
  });
  const fixture = TestBed.createComponent(Table);
  await fixture.whenStable();
  fixture.detectChanges();
  const dialog = () => document.body.querySelector<HTMLElement>('app-game-over [role=dialog]');
  return { socket, celebration, fixture, dialog, el: fixture.nativeElement as HTMLElement };
}

describe('Table game-over modal', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    document.body.querySelectorAll('.p-dialog-mask').forEach((m) => m.remove());
  });

  it('is not shown while the game runs', async () => {
    const { dialog, celebration } = await setup(
      gameView({ phase: 'running', game: engine({ result: null }) }, seats),
    );
    expect(dialog()).toBeNull();
    expect(celebration.start).not.toHaveBeenCalled();
  });

  it('shows the ranking over the table and congratulates the winner', async () => {
    const { dialog, el, celebration } = await setup(finished());
    const text = dialog()?.textContent ?? '';
    expect(text).toContain('Game over');
    expect(text).toContain('You won!');
    expect(text).toContain('The target score was reached.');
    expect(text).toContain('Rank 1');
    expect(text).toContain('Ann (10100) · you');
    expect(text).toMatch(/Rank 2\s*Bob \(6000\),\s*Cy \(6000\)/);
    expect(el.textContent).toContain('Bob');
    expect(celebration.start).toHaveBeenCalled();
  });

  it('names the winner for everybody else and does not celebrate', async () => {
    const { dialog, celebration } = await setup(
      finished({ you: { playerId: 'p1', seat: 1, timeoutWarning: false } }),
    );
    const text = dialog()?.textContent ?? '';
    expect(text).toContain('Ann won.');
    expect(text).toContain('Bob (6000) · you');
    expect(celebration.start).not.toHaveBeenCalled();
    expect(celebration.stop).toHaveBeenCalled();
  });

  it('names a Clover win', async () => {
    const clover = { ...result, reason: 'clover' } as const;
    const { dialog } = await setup(finished({ game: engine({ result: clover }) }));
    expect(dialog()?.textContent).toContain('Clover');
  });

  it('shows nothing to a player whose seat a computer took over', async () => {
    const { dialog, celebration } = await setup(
      finished({ you: { playerId: 'p0', seat: -1, timeoutWarning: false } }),
    );
    expect(dialog()).toBeNull();
    expect(celebration.start).not.toHaveBeenCalled();
  });

  it('cannot be closed by Escape or the backdrop and leaves with its button', async () => {
    const { dialog, socket, fixture } = await setup(finished());
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    document.body.querySelector<HTMLElement>('.p-dialog-mask')?.click();
    fixture.detectChanges();
    expect(dialog()).not.toBeNull();
    expect(dialog()?.querySelector('.p-dialog-close-button')).toBeNull();
    const back = [...dialog()!.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Back to the lobby'),
    );
    back!.click();
    expect(socket.leave).toHaveBeenCalled();
  });

  it('waits for the last dice and stops celebrating when the game goes away', async () => {
    localStorage.setItem('vl-skip-dice', 'false');
    const running = gameView({ phase: 'running', game: engine({ result: null }) }, seats);
    const { socket, dialog, fixture, celebration } = await setup(running);
    vi.useFakeTimers();
    try {
      const thrown = { at: 1, kind: 'turn', seat: 0, data: { type: 'thrown', dice: [6, 4] } };
      socket.game.set({ ...finished(), log: [thrown, ...endLog] } as never);
      fixture.detectChanges();
      expect(dialog()).toBeNull();
      expect(celebration.start).not.toHaveBeenCalled();
      vi.advanceTimersByTime(3500);
      fixture.detectChanges();
      expect(dialog()).not.toBeNull();
      expect(celebration.start).toHaveBeenCalled();
      socket.game.set(null);
      fixture.detectChanges();
      expect(celebration.stop).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
      localStorage.removeItem('vl-skip-dice');
    }
  });
});
