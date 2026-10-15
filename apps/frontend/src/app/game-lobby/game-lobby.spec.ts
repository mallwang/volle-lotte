import { TestBed } from '@angular/core/testing';
import type { SeatView } from 'game-rules';
import { SocketService } from '../core/socket.service';
import { gameView, stubSocket } from '../core/testing';
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
    providers: [{ provide: SocketService, useValue: socket }],
  });
  const fixture = TestBed.createComponent(GameLobby);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.includes(text));
  return { socket, el, button };
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

  it('counts computers as ready', async () => {
    const { button } = await setup(
      gameView({}, [me(true), { state: 'computer', difficulty: 'easy' }]),
    );
    expect((button('Start game') as HTMLButtonElement).disabled).toBe(false);
  });

  it('hides host controls from non-hosts', async () => {
    const { el, button } = await setup(
      gameView({ hostId: 'p1', you: { playerId: 'p0', seat: 1 } }, [other(true), me(false)]),
    );
    expect(button('Start game')).toBeUndefined();
    expect(button('Lock')).toBeUndefined();
    expect(el.textContent).toContain('Waiting for Bob');
    expect(el.querySelector('input[type=checkbox]')).toBeTruthy();
  });
});
