import { TestBed } from '@angular/core/testing';
import { Router, type ActivatedRouteSnapshot, type RouterStateSnapshot } from '@angular/router';
import { ConfirmationService, type Confirmation } from 'primeng/api';
import { I18nService } from './i18n.service';
import { LeaveGame, leaveGameGuard } from './leave-game';
import { SocketService } from './socket.service';
import { gameView, stubSocket } from './testing';

function setup(game = gameView({ phase: 'lobby' })) {
  const socket = stubSocket(game);
  socket.leave.mockResolvedValue(true);
  const confirmation = { confirm: vi.fn(), close: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      { provide: SocketService, useValue: socket },
      { provide: ConfirmationService, useValue: confirmation },
      {
        provide: Router,
        useValue: { events: { subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })) } },
      },
    ],
  });
  const leave = TestBed.inject(LeaveGame);
  const opened = () => confirmation.confirm.mock.calls[0][0] as Confirmation;
  return { socket, leave, confirmation, opened };
}

const guard = () =>
  TestBed.runInInjectionContext(() =>
    leaveGameGuard(
      null as never,
      {} as ActivatedRouteSnapshot,
      {} as RouterStateSnapshot,
      {} as RouterStateSnapshot,
    ),
  ) as Promise<boolean>;

describe('LeaveGame', () => {
  it('derives the situation from the game', () => {
    const { socket, leave } = setup(gameView({ phase: 'lobby' }));
    expect(leave.situation()).toBe('lobbyHost');
    socket.game.set(gameView({ phase: 'lobby', hostId: 'p1' }));
    expect(leave.situation()).toBe('lobbyGuest');
    socket.game.set(gameView({ phase: 'running' }));
    expect(leave.situation()).toBe('running');
    socket.game.set(gameView({ phase: 'finished' }));
    expect(leave.situation()).toBe('none');
    socket.game.set(
      gameView({ phase: 'running', you: { playerId: 'p0', seat: -1, timeoutWarning: false } }),
    );
    expect(leave.situation()).toBe('none');
    socket.game.set(null);
    expect(leave.situation()).toBe('none');
  });

  it('confirm() needs no dialog when there is nothing to leave', async () => {
    const { socket, leave, confirmation } = setup();
    socket.game.set(null);
    expect(await leave.confirm()).toBe(true);
    expect(confirmation.confirm).not.toHaveBeenCalled();
  });

  it('resolves true on accept and false on reject', async () => {
    const a = setup(gameView({ phase: 'running' }));
    const accepted = a.leave.confirm();
    a.opened().accept!();
    expect(await accepted).toBe(true);
    const r = a.leave.confirm();
    a.confirmation.confirm.mock.calls[1][0].reject();
    expect(await r).toBe(false);
  });

  it('returns the same promise while a dialog is open', () => {
    const { leave, confirmation } = setup();
    const first = leave.confirm();
    expect(leave.confirm()).toBe(first);
    expect(confirmation.confirm).toHaveBeenCalledTimes(1);
  });

  it('words the dialog per situation and defaults to "Stay"', () => {
    const texts = new Map<string, Confirmation>();
    const cases = [
      ['running', gameView({ phase: 'running' })],
      ['lobbyHost', gameView({ phase: 'lobby' })],
      ['lobbyGuest', gameView({ phase: 'lobby', hostId: 'p1' })],
    ] as const;
    for (const [name, game] of cases) {
      TestBed.resetTestingModule();
      const { leave, opened } = setup(game);
      void leave.confirm();
      texts.set(name, opened());
    }
    expect(texts.get('running')).toMatchObject({
      header: 'Leave the running game?',
      acceptLabel: 'Leave game',
      rejectLabel: 'Stay',
      defaultFocus: 'reject',
    });
    expect(texts.get('lobbyHost')).toMatchObject({
      header: 'Cancel your planned game?',
      acceptLabel: 'Cancel game',
    });
    expect(texts.get('lobbyGuest')).toMatchObject({
      header: 'Leave the lobby?',
      acceptLabel: 'Leave lobby',
    });
    expect(TestBed.inject(I18nService).lang()).toBe('en');
  });

  it('closes the dialog and resolves true when the game ends meanwhile', async () => {
    const { socket, leave, confirmation } = setup(gameView({ phase: 'running' }));
    const result = leave.confirm();
    socket.game.set(null);
    TestBed.tick();
    expect(confirmation.close).toHaveBeenCalled();
    expect(await result).toBe(true);
  });

  it('request() leaves only after confirmation', async () => {
    const { socket, leave, opened } = setup();
    const done = leave.request();
    expect(socket.leave).not.toHaveBeenCalled();
    opened().accept!();
    await done;
    expect(socket.leave).toHaveBeenCalledTimes(1);
  });

  it('request() stays when the player chooses "Stay"', async () => {
    const { socket, leave, opened } = setup();
    const done = leave.request();
    opened().reject!();
    await done;
    expect(socket.leave).not.toHaveBeenCalled();
  });
});

describe('LeaveGame tab close warning', () => {
  const fire = () => {
    const e = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(e);
    return e.defaultPrevented;
  };

  it('asks the browser to warn while a lobby or game is open, not otherwise', () => {
    const { socket } = setup(gameView({ phase: 'running' }));
    TestBed.tick();
    expect(fire()).toBe(true);
    socket.game.set(gameView({ phase: 'finished' }));
    TestBed.tick();
    expect(fire()).toBe(false);
    socket.game.set(null);
    TestBed.tick();
    expect(fire()).toBe(false);
  });
});

describe('leaveGameGuard', () => {
  it('blocks the navigation on "Stay"', async () => {
    const { socket, opened } = setup();
    const result = guard();
    opened().reject!();
    expect(await result).toBe(false);
    expect(socket.leave).not.toHaveBeenCalled();
  });

  it('leaves once on confirm, mutes the redirect, then allows the navigation', async () => {
    const { socket, leave, opened } = setup();
    const result = guard();
    opened().accept!();
    expect(await result).toBe(true);
    expect(socket.leave).toHaveBeenCalledTimes(1);
    expect(leave.leaving()).toBe(true);
  });

  it('passes without a dialog when there is nothing to leave', async () => {
    const { socket, confirmation } = setup();
    socket.game.set(null);
    expect(await guard()).toBe(true);
    expect(confirmation.confirm).not.toHaveBeenCalled();
    expect(socket.leave).not.toHaveBeenCalled();
  });

  it('leaves a finished game without a dialog', async () => {
    const { socket, confirmation, leave } = setup(gameView({ phase: 'finished' }));
    expect(await guard()).toBe(true);
    expect(confirmation.confirm).not.toHaveBeenCalled();
    expect(socket.leave).toHaveBeenCalledTimes(1);
    expect(leave.leaving()).toBe(true);
  });

  it('blocks the navigation when the server rejects the leave', async () => {
    const { socket, leave, opened } = setup();
    socket.leave.mockResolvedValue(false);
    const result = guard();
    opened().accept!();
    expect(await result).toBe(false);
    expect(leave.leaving()).toBe(false);
  });
});
