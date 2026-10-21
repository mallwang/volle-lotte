import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { encodeView, type GameView } from 'game-rules';
import { Celebration } from '../core/celebration';
import { MobileSocketService } from '../core/mobile-socket.service';
import { fakeSocket } from '../core/testing';
import { running } from './testing';
import { Table } from './table';

function setup(view: GameView | null) {
  const { emit, fire } = fakeSocket();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: Celebration, useValue: { start: vi.fn(), stop: vi.fn() } },
    ],
  });
  TestBed.inject(MobileSocketService);
  const nav = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  const show = (v: GameView) => fire('game:snapshot', { game: encodeView(v) });
  if (view) show(view);
  const fixture = TestBed.createComponent(Table);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const buttons = (scope = 'app-table-actions') => [
    ...el.querySelectorAll<HTMLButtonElement>(`${scope} button`),
  ];
  const button = (text: string) => buttons().find((b) => b.textContent?.includes(text))!;
  const update = () => (fixture.detectChanges(), fixture.whenStable());
  return { emit, nav, show, el, button, buttons, update, fixture };
}

describe('Table', () => {
  it('offers only the draw button at the start of my turn and sends it', () => {
    const { emit, button, buttons } = setup(running());
    expect(buttons().filter((b) => !b.disabled)).toEqual([button('Draw')]);
    button('Draw').click();
    expect(emit).toHaveBeenCalledWith(
      'turn:action',
      { action: { type: 'draw' } },
      expect.any(Function),
    );
  });

  it('disables everything and names who is playing on another seat’s turn', () => {
    const { el, buttons } = setup(running({}, { current: 1 }));
    expect(buttons().every((b) => b.disabled)).toBe(true);
    expect(el.querySelector('.status')?.textContent).toContain('Ben');
  });

  it('previews the chosen dice and sends them sorted with Select', async () => {
    const { emit, el, button, update } = setup(
      running({ phase: 'select', card: 'bonus100' as never, dice: [1, 5, 2, 3, 4, 6], free: 6 }),
    );
    expect(button('Set aside').disabled).toBe(true);
    const dice = el.querySelectorAll<HTMLButtonElement>('.die');
    dice[2].click();
    dice[0].click();
    await update();
    expect(emit).toHaveBeenLastCalledWith('turn:preview', { dice: [2, 0] }, expect.any(Function));
    button('Set aside').click();
    expect(emit).toHaveBeenLastCalledWith(
      'turn:action',
      { action: { type: 'select', dice: [0, 2] } },
      expect.any(Function),
    );
  });

  it('holds the table on a bust notice and blocks the actions meanwhile', async () => {
    const view = running({ phase: 'draw' }, { current: 0 });
    const { show, el, buttons, update } = setup(view);
    show({
      ...view,
      n: 1,
      log: [{ at: 1, kind: 'turn', seat: 1, data: { type: 'thrown', dice: [2, 3] } }],
    });
    await update();
    expect(el.querySelector('.status')?.textContent).toContain('rolling');
    expect(buttons().every((b) => b.disabled)).toBe(true);
  });

  it('leaves for the list when the game is gone', () => {
    const { nav } = setup(null);
    expect(nav).toHaveBeenCalledWith('/');
  });

  it('shows the result when the game is over', async () => {
    const view = running();
    view.game = {
      ...view.game!,
      result: {
        reason: 'targetScore',
        winner: 0,
        ranking: [
          { rank: 1, players: [0] },
          { rank: 2, players: [1] },
        ],
      },
    };
    const { el, update } = setup(view);
    await update();
    expect(el.querySelector('app-game-over')?.textContent).toContain('You won');
  });

  it('asks before leaving and sends game:leave on confirm', async () => {
    const { emit, el, update, fixture } = setup(running());
    el.querySelector<HTMLButtonElement>('.leave')!.click();
    await update();
    expect(el.querySelector('app-leave-dialog')).not.toBeNull();
    [...el.querySelectorAll<HTMLButtonElement>('app-leave-dialog .primary')][0].click();
    expect(emit).toHaveBeenCalledWith('game:leave', undefined, expect.any(Function));
    fixture.destroy();
  });

  it('keeps the table mounted next to the portrait blocker, which offers Leave', () => {
    const { el } = setup(running());
    expect(el.querySelector('app-table-board')).not.toBeNull();
    expect(el.querySelector('.rotate button')).not.toBeNull();
  });
});
