import { TestBed } from '@angular/core/testing';
import { defaultRules, type GameStateView, type SeatView } from 'game-rules';
import { SocketService } from '../core/socket.service';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { expectNoA11yViolations, gameView, inBothModes, stubSocket } from '../core/testing';
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
    providers: [providePrimeNG(), MessageService, { provide: SocketService, useValue: socket }],
  });
  const fixture = TestBed.createComponent(Table);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.includes(text)) as
      HTMLButtonElement | undefined;
  const toasts = vi.spyOn(TestBed.inject(MessageService), 'add');
  return { socket, el, button, fixture, toasts };
}

describe('Table', () => {
  it('shows scores, deck size and offline tag', async () => {
    const { el } = await setup(0);
    expect(el.textContent).toContain('Deck: 42');
    expect(el.textContent).toContain('Bob');
    expect(el.textContent).toContain('Offline');
    expect(el.querySelector('[aria-current=true]')?.textContent).toContain('Ann');
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
    const { socket, el, button, fixture, toasts } = await setup(0);
    socket.send.mockResolvedValue({ ok: false, reason: 'rejected', engine: 'belowMinimum' });
    el.querySelector<HTMLButtonElement>('[aria-label=Dice] button')!.click();
    fixture.detectChanges();
    button('Set aside')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(toasts).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        detail: expect.stringContaining('minimum points'),
      }),
    );
    expect(button('Draw')).toBeTruthy();
  });

  it('explains disabled actions via aria-describedby', async () => {
    const { el, button } = await setup(1);
    const id = button('Throw')!.getAttribute('aria-describedby')!;
    expect(el.querySelector(`#${id}`)?.textContent).toContain('Not your turn');
  });

  it('gives the active player a reason for an empty selection', async () => {
    const { el, button } = await setup(0);
    const id = button('Set aside')!.getAttribute('aria-describedby')!;
    expect(el.querySelector(`#${id}`)?.textContent).toContain('Select at least one die');
  });

  it.each([2, 5, 8])('renders %i players', async (n) => {
    const players = Array.from({ length: n }, (_, i) => ({ name: `P${i}`, score: i }));
    const { el } = await setup(0, { game: { ...state(0), players } });
    expect(el.querySelectorAll('app-player-tile')).toHaveLength(n);
  });

  it('has a polite, unfocusable log newest first', async () => {
    const log = [
      { kind: 'joined', seat: 0 },
      { kind: 'left', seat: 1 },
    ];
    const { el } = await setup(0, { log });
    const ol = el.querySelector('[role=log]')!;
    expect(ol.getAttribute('aria-live')).toBe('polite');
    expect(ol.hasAttribute('tabindex')).toBe(false);
    expect([...ol.querySelectorAll('li')].map((l) => l.textContent?.trim())).toEqual([
      'Bob left',
      'Ann joined',
    ]);
  });

  it('frames each thrown die in the log', async () => {
    const log = [{ kind: 'turn', seat: 0, data: { type: 'thrown', dice: [6, 4, 3, 4] } }];
    const { el } = await setup(0, { log });
    expect([...el.querySelectorAll('.vl-log-die')].map((d) => d.textContent)).toEqual([
      '6',
      '4',
      '3',
      '4',
    ]);
  });

  it('toasts a new turn-end event', async () => {
    const { socket, toasts, fixture } = await setup(0);
    const view = socket.game()!;
    socket.game.set({
      ...view,
      log: [{ kind: 'turn', seat: 0, data: { type: 'banked', points: 300 } }],
    } as never);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(toasts).toHaveBeenCalledWith(expect.objectContaining({ detail: 'Ann banked 300' }));
  });

  it('is keyboard operable: dice then actions are native buttons in order', async () => {
    const { el } = await setup(0);
    const order = [...el.querySelectorAll('button')].map((b) => b.disabled);
    expect(order.length).toBeGreaterThan(4);
    expect(el.querySelectorAll('button[tabindex="-1"]')).toHaveLength(0);
  });

  it('has no a11y violations in both modes', async () => {
    const { fixture } = await setup(0);
    await inBothModes(fixture, () => expectNoA11yViolations(fixture));
  });
});
