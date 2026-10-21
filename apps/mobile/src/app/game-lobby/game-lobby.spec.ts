import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { encodeView, type GameView, type SeatView } from 'game-rules';
import { MobileSocketService } from '../core/mobile-socket.service';
import { fakeSocket, gameView } from '../core/testing';
import { GameLobby } from './game-lobby';

const human = (playerId: string, ready: boolean): SeatView => ({
  state: 'human',
  playerId,
  nickname: playerId,
  ready,
});

function setup(view: GameView) {
  const { emit, fire } = fakeSocket();
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  TestBed.inject(MobileSocketService);
  const nav = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  const show = (v: GameView) => fire('game:snapshot', { game: encodeView(v) });
  show(view);
  const fixture = TestBed.createComponent(GameLobby);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    [...el.querySelectorAll('button')].find((b) =>
      b.textContent?.includes(text),
    ) as HTMLButtonElement;
  const update = () => (fixture.detectChanges(), fixture.whenStable());
  return { emit, fire, nav, show, el, button, update, fixture };
}

describe('GameLobby', () => {
  it('lets the host start once every human is ready', () => {
    const view = gameView({}, [human('p0', true), human('p1', false)]);
    const { emit, show, button, update } = setup(view);
    expect(button('Start game').disabled).toBe(true);
    show({ ...view, seats: [human('p0', true), human('p1', true), ...view.seats.slice(2)] });
    return update().then(() => {
      button('Start game').click();
      expect(emit).toHaveBeenCalledWith('game:start', undefined, expect.any(Function));
    });
  });

  it('shows a guest the waiting text and a ready toggle, without host controls', () => {
    const view = gameView({ you: { playerId: 'p1', seat: 1, timeoutWarning: false } }, [
      human('p0', true),
      human('p1', false),
    ]);
    const { emit, el, button } = setup(view);
    expect(el.textContent).toContain('Waiting for p0');
    expect(button('Start game')).toBeUndefined();
    expect(button('Lock')).toBeUndefined();
    button('Ready').click();
    expect(emit).toHaveBeenCalledWith('seat:ready', { ready: true }, expect.any(Function));
  });

  it('adds a computer to a free seat', () => {
    const { emit, button } = setup(gameView({}, [human('p0', false)]));
    button('Add computer').click();
    expect(emit).toHaveBeenCalledWith(
      'seat:set',
      { seat: 1, mode: 'computer', difficulty: 'medium', risk: 'medium' },
      expect.any(Function),
    );
  });

  it('announces a new host and leaves for the list when the game is closed', async () => {
    const view = gameView({}, [human('p0', true), human('p1', true)]);
    const { fire, show, el, nav, update } = setup(view);
    show({ ...view, hostId: 'p1', n: 1 });
    await update();
    expect(el.querySelector('[role=status]')?.textContent).toContain('p1 is the new host');
    fire('game:closed', { reason: 'banned' });
    await update();
    expect(nav).toHaveBeenCalledWith('/');
    expect(TestBed.inject(MobileSocketService).notice()).toBe('server.banned');
  });
});
