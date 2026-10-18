import { TestBed } from '@angular/core/testing';
import type { SeatView } from 'game-rules';
import { LeaveGame } from '../core/leave-game';
import { SocketService } from '../core/socket.service';
import { providePrimeNG } from 'primeng/config';
import { expectNoA11yViolations, gameView, inBothModes, stubSocket } from '../core/testing';
import { GameLobby } from './game-lobby';

const me = (ready: boolean): SeatView => ({
  state: 'human',
  playerId: 'p0',
  nickname: 'Ann',
  connected: true,
  ready,
});
const other = (ready: boolean): SeatView => ({
  state: 'human',
  playerId: 'p1',
  nickname: 'Bob',
  connected: true,
  ready,
});

async function setup(game: ReturnType<typeof gameView>) {
  const socket = stubSocket(game);
  TestBed.configureTestingModule({
    imports: [GameLobby],
    providers: [
      providePrimeNG(),
      { provide: SocketService, useValue: socket },
      { provide: LeaveGame, useValue: { request: vi.fn() } },
    ],
  });
  const fixture = TestBed.createComponent(GameLobby);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.includes(text));
  return { socket, el, button, fixture, leave: TestBed.inject(LeaveGame) };
}

describe('GameLobby', () => {
  it('shows host controls and gates Start until all humans are ready', async () => {
    const { button } = await setup(gameView({}, [me(true), other(false)]));
    expect((button('Start game') as HTMLButtonElement).disabled).toBe(true);
    expect(button('Lock')).toBeTruthy();
    expect(button('Add computer')).toBeTruthy();
  });

  it('enables Start when ready and sends it', async () => {
    const { socket, button } = await setup(gameView({}, [me(true), other(true)]));
    socket.send.mockResolvedValue({ ok: true });
    const start = button('Start game') as HTMLButtonElement;
    expect(start.disabled).toBe(false);
    start.click();
    expect(socket.send).toHaveBeenCalledWith('game:start');
  });

  it('lets the host remove another player', async () => {
    const { socket, button } = await setup(gameView({}, [me(true), other(true)]));
    socket.send.mockResolvedValue({ ok: true });
    button('Remove this player')!.click();
    expect(socket.send).toHaveBeenCalledWith('seat:remove', { seat: 1 });
  });

  it('counts computers as ready', async () => {
    const { button } = await setup(
      gameView({}, [me(true), { state: 'computer', difficulty: 'easy' }]),
    );
    expect((button('Start game') as HTMLButtonElement).disabled).toBe(false);
  });

  it('hides host controls from non-hosts', async () => {
    const { el, button } = await setup(
      gameView({ hostId: 'p1', you: { playerId: 'p0', seat: 1, timeoutWarning: false } }, [
        other(true),
        me(false),
      ]),
    );
    expect(button('Start game')).toBeUndefined();
    expect(button('Lock')).toBeUndefined();
    expect(el.textContent).toContain('Waiting for Bob');
    expect(el.querySelector('input[type=checkbox]')).toBeTruthy();
  });

  it('shows the settings panel to the host with an enabled slider', async () => {
    const { el } = await setup(gameView({}, [me(false)]));
    expect(el.querySelector('h3')?.textContent).toContain('Game settings');
    expect(el.querySelector('p-slider')).toBeTruthy();
    expect(el.querySelector('p-slider.p-disabled')).toBeNull();
  });

  it('shows the settings panel to a guest with a disabled slider', async () => {
    const { el } = await setup(
      gameView({ hostId: 'p1', you: { playerId: 'p0', seat: 1, timeoutWarning: false } }, [
        other(true),
        me(false),
      ]),
    );
    expect(el.querySelector('p-slider')).toBeTruthy();
    expect(el.querySelector('p-slider.p-disabled')).toBeTruthy();
    expect(el.textContent).toContain('Only the host can change this.');
  });

  it('shows every seat state with a text label and icon', async () => {
    const { el } = await setup(
      gameView({}, [
        me(true),
        { state: 'computer', difficulty: 'easy' },
        { state: 'locked' },
        { state: 'open' },
      ]),
    );
    for (const t of ['Ready', 'Computer (easy)', 'Locked', 'Free'])
      expect(el.textContent).toContain(t);
    expect(el.querySelectorAll('p-tag .pi').length).toBeGreaterThanOrEqual(4);
  });

  it('host withdraw and guest leave go through the shared confirmation', async () => {
    const host = await setup(gameView({}, [me(true), other(true)]));
    host.button('Withdraw')!.click();
    expect(host.leave.request).toHaveBeenCalledTimes(1);
    expect(host.socket.leave).not.toHaveBeenCalled();
    TestBed.resetTestingModule();
    const guest = await setup(
      gameView({ hostId: 'p1', you: { playerId: 'p0', seat: 1, timeoutWarning: false } }, [
        other(true),
        me(false),
      ]),
    );
    guest.button('Leave game')!.click();
    expect(guest.leave.request).toHaveBeenCalledTimes(1);
    expect(guest.socket.leave).not.toHaveBeenCalled();
  });

  it('has no a11y violations in both modes', async () => {
    const { fixture } = await setup(gameView({}, [me(true), other(false)]));
    await inBothModes(fixture, () => expectNoA11yViolations(fixture));
  });
});
