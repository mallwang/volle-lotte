import { TestBed } from '@angular/core/testing';
import { defaultRules, type GameStateView, type SeatView } from 'game-rules';
import { SocketService } from '../core/socket.service';
import { gameView, stubSocket } from '../core/testing';
import { Table } from './table';

const human = (id: string, name: string, connected = true): SeatView => ({
  state: 'human',
  playerId: id,
  nickname: name,
  connected,
});

const state = (current: number): GameStateView => ({
  version: 1,
  rules: defaultRules(),
  players: [
    { name: 'Ann', score: 100 },
    { name: 'Bob', score: 200 },
  ],
  current,
  deckSize: 42,
  turn: {
    phase: 'select',
    card: 'bonus200',
    dice: [1, 5, 2],
    free: 3,
    carried: 0,
    run: 0,
    street: [],
    volleLottes: 0,
  },
  result: null,
});

async function setup(current: number, over = {}) {
  const socket = stubSocket(
    gameView({ phase: 'running', game: state(current), ...over }, [
      human('p0', 'Ann'),
      human('p1', 'Bob', false),
    ]),
  );
  TestBed.configureTestingModule({
    imports: [Table],
    providers: [{ provide: SocketService, useValue: socket }],
  });
  const fixture = TestBed.createComponent(Table);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.includes(text)) as
      HTMLButtonElement | undefined;
  return { socket, el, button, fixture };
}

describe('Table', () => {
  it('shows scores, deck size and offline tag', async () => {
    const { el } = await setup(0);
    expect(el.textContent).toContain('Deck: 42');
    expect(el.textContent).toContain('Bob');
    expect(el.textContent).toContain('(offline)');
  });

  it('lets the active player select dice and sends the indices', async () => {
    const { socket, el, button, fixture } = await setup(0);
    socket.send.mockResolvedValue({ ok: true });
    expect(button('Set aside')!.disabled).toBe(true);
    const dice = el.querySelectorAll<HTMLButtonElement>('[aria-label=Dice] button');
    dice[1].click();
    dice[0].click();
    fixture.detectChanges();
    button('Set aside')!.click();
    expect(socket.send).toHaveBeenCalledWith('turn:action', {
      action: { type: 'select', dice: [0, 1] },
    });
  });

  it('disables controls when it is not my turn', async () => {
    const { button } = await setup(1);
    expect(button('Set aside')!.disabled).toBe(true);
    expect(button('Throw')!.disabled).toBe(true);
  });

  it('renders a rejected move', async () => {
    const { socket, el, button, fixture } = await setup(0);
    socket.send.mockResolvedValue({ ok: false, reason: 'rejected', engine: 'belowMinimum' });
    el.querySelector<HTMLButtonElement>('[aria-label=Dice] button')!.click();
    fixture.detectChanges();
    button('Set aside')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelector('.error')?.textContent).toContain('belowMinimum');
  });
});
