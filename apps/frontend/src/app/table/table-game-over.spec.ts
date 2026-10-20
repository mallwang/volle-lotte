import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  applyChange,
  encodeLog,
  type GameStateView,
  type GameView,
  type SeatView,
} from 'game-rules';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { Celebration } from '../core/celebration';
import { LeaveGame } from '../core/leave-game';
import { Sounds } from '../core/sounds';
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
  const sounds = { preload: vi.fn(), play: vi.fn(), stop: vi.fn(), muted: signal(false) };
  TestBed.configureTestingModule({
    imports: [Table],
    providers: [
      providePrimeNG(),
      MessageService,
      { provide: SocketService, useValue: socket },
      { provide: LeaveGame, useValue: { request: vi.fn() } },
      { provide: Celebration, useValue: celebration },
      { provide: Sounds, useValue: sounds },
    ],
  });
  const fixture = TestBed.createComponent(Table);
  await fixture.whenStable();
  fixture.detectChanges();
  const dialog = () => document.body.querySelector<HTMLElement>('app-game-over [role=dialog]');
  return { socket, celebration, sounds, fixture, dialog, el: fixture.nativeElement as HTMLElement };
}

describe('Table game-over modal', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    document.body.querySelectorAll('.p-dialog-mask').forEach((m) => m.remove());
  });

  it('is not shown while the game runs', async () => {
    const { dialog, celebration, sounds } = await setup(
      gameView({ phase: 'running', game: engine({ result: null }) }, seats),
    );
    expect(dialog()).toBeNull();
    expect(celebration.start).not.toHaveBeenCalled();
    expect(sounds.play).not.toHaveBeenCalledWith('defeat');
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

  it('opens when the end arrives as a game:change with the phase, the game and the last entries', async () => {
    const running = gameView({ phase: 'running', game: engine({ result: null }) }, seats);
    const { socket, dialog, fixture, celebration } = await setup(running);
    expect(dialog()).toBeNull();
    socket.game.set(
      applyChange(running, {
        n: 1,
        phase: 'finished',
        game: engine(),
        log: encodeLog(endLog as never),
      }),
    );
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(dialog()?.textContent).toContain('You won!');
    expect(celebration.start).toHaveBeenCalledTimes(1);
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

  it('plays the defeat sound once for a player who did not win, not the victory', async () => {
    const { sounds, socket, fixture } = await setup(
      finished({ you: { playerId: 'p1', seat: 1, timeoutWarning: false } }),
    );
    expect(sounds.play.mock.calls.filter(([c]) => c === 'defeat')).toHaveLength(1);
    // a later log entry (a player leaving) must not play it again
    socket.game.set({ ...socket.game()! });
    fixture.detectChanges();
    expect(sounds.play.mock.calls.filter(([c]) => c === 'defeat')).toHaveLength(1);
  });

  it('plays no defeat sound for the winner', async () => {
    const { sounds } = await setup(finished());
    expect(sounds.play).not.toHaveBeenCalledWith('defeat');
  });

  it('keeps the modal and plays the celebration once when a player leaves afterwards', async () => {
    const { socket, dialog, fixture, celebration } = await setup(finished());
    expect(dialog()).not.toBeNull();
    expect(celebration.start).toHaveBeenCalledTimes(1);
    celebration.stop.mockClear();
    const left = { at: 3, kind: 'left', seat: 1 };
    socket.game.set(finished({ log: [...endLog, left] as never }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(dialog()).not.toBeNull();
    expect(celebration.stop).not.toHaveBeenCalled();
    expect(celebration.start).toHaveBeenCalledTimes(1);
  });

  it('names a Clover win', async () => {
    const clover = { ...result, reason: 'clover' } as const;
    const { dialog } = await setup(finished({ game: engine({ result: clover }) }));
    expect(dialog()?.textContent).toContain('Clover');
  });

  it('shows nothing to a player whose seat a computer took over', async () => {
    const { dialog, celebration, sounds } = await setup(
      finished({ you: { playerId: 'p0', seat: -1, timeoutWarning: false } }),
    );
    expect(dialog()).toBeNull();
    expect(celebration.start).not.toHaveBeenCalled();
    expect(sounds.play).not.toHaveBeenCalledWith('defeat');
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

  describe('rematch', () => {
    const buttons = (dialog: HTMLElement | null) =>
      [...(dialog?.querySelectorAll('button') ?? [])].map((b) => b.textContent?.trim());
    const guest = (over: Partial<GameView> = {}) =>
      finished({ you: { playerId: 'p1', seat: 1, timeoutWarning: false }, ...over });

    it('offers the host "Rematch" next to "Back to the lobby"', async () => {
      const { dialog, socket } = await setup(finished());
      expect(buttons(dialog())).toEqual(['Rematch', 'Back to the lobby']);
      expect(dialog()?.textContent).toContain('A rematch reopens this game as a lobby');
      [...dialog()!.querySelectorAll('button')]
        .find((b) => b.textContent?.includes('Rematch'))!
        .click();
      expect(socket.rematch).toHaveBeenCalled();
    });

    it('shows a guest a disabled "Rejoin" until the host decided', async () => {
      const { dialog, socket } = await setup(guest());
      expect(buttons(dialog())).toEqual(['Rejoin', 'Back to the lobby']);
      const rejoin = dialog()!.querySelector('button') as HTMLButtonElement;
      expect(rejoin.disabled).toBe(true);
      expect(dialog()?.textContent).toContain('Waiting for Ann to decide about a rematch.');
      rejoin.click();
      expect(socket.rejoinRematch).not.toHaveBeenCalled();
    });

    it('activates "Rejoin" when the seat is reserved and sends it', async () => {
      const { dialog, socket, fixture } = await setup(guest());
      socket.game.set(
        guest({
          rematch: 'open',
          you: { playerId: 'p1', seat: 1, timeoutWarning: false, reserved: 1 },
        }),
      );
      fixture.detectChanges();
      const rejoin = dialog()!.querySelector('button') as HTMLButtonElement;
      expect(rejoin.disabled).toBe(false);
      expect(dialog()?.textContent).toContain(
        'Ann started a rematch. Your seat 2 is reserved for you.',
      );
      rejoin.click();
      expect(socket.rejoinRematch).toHaveBeenCalled();
    });

    it('disables "Rejoin" again once the next game started without the player', async () => {
      const { dialog } = await setup(guest({ rematch: 'closed' }));
      expect((dialog()!.querySelector('button') as HTMLButtonElement).disabled).toBe(true);
      expect(dialog()?.textContent).toContain('The next game has already started without you.');
    });

    it('lets a guest go back at any time', async () => {
      const { dialog, socket } = await setup(guest());
      [...dialog()!.querySelectorAll('button')]
        .find((b) => b.textContent?.includes('Back'))!
        .click();
      expect(socket.leave).toHaveBeenCalled();
    });
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

  it('offers a spectator only the way back, with a hint and no celebration', async () => {
    const { dialog, celebration, sounds } = await setup(
      finished({
        you: { playerId: 'v1', seat: -1, timeoutWarning: false, spectator: true },
      }),
    );
    const text = dialog()?.textContent ?? '';
    expect(text).toContain('Ann won.');
    expect(text).toContain('Thanks for watching');
    const buttons = [...dialog()!.querySelectorAll('button')].map((b) => b.textContent?.trim());
    expect(buttons).toEqual(['Back to the lobby']);
    expect(celebration.start).not.toHaveBeenCalled();
    expect(sounds.play).not.toHaveBeenCalledWith('defeat');
  });
});
