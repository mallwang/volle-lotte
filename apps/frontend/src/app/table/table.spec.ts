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

const thrownLog = { kind: 'turn', seat: 1, data: { type: 'thrown', dice: [6, 4] } };

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

async function setup(current: number, over = {}, showLog = true) {
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
  if (showLog) {
    button('Log')?.click();
    await fixture.whenStable();
  }
  const toasts = vi.spyOn(TestBed.inject(MessageService), 'add');
  return { socket, el, button, fixture, toasts };
}

describe('Table', () => {
  it('shows scores, deck size and offline tag', async () => {
    const { el } = await setup(0);
    expect(el.textContent).toContain('Points: ');
    expect(el.querySelector('app-card-deck [aria-label^="Draw pile: 42 cards"]')).not.toBeNull();
    expect(el.querySelector('app-discard-pile [aria-label^="Discard pile"]')).not.toBeNull();
    expect(el.textContent).toContain('Bob');
    expect(el.textContent).toContain('Offline');
    expect(el.querySelector('[aria-current=true]')?.textContent).toContain('Ann');
  });

  it('hides the log until toggled', async () => {
    const { el } = await setup(0, {}, false);
    expect(el.querySelector('.vl-log')).toBeNull();
  });

  it('lets the active player select dice and sends the indices', async () => {
    const { socket, el, button, fixture } = await setup(0);
    socket.send.mockResolvedValue({ ok: true });
    expect(button('Set aside')).toBeUndefined();
    const dice = el.querySelectorAll<HTMLButtonElement>('[aria-label=Dice] button');
    dice[1].click();
    dice[0].click();
    fixture.detectChanges();
    button('Set aside')!.click();
    expect(socket.send).toHaveBeenCalledWith('turn:action', {
      action: { type: 'select', dice: [0, 1] },
    });
  });

  it('hides the action buttons when it is not my turn', async () => {
    const { button } = await setup(1);
    expect(button('Set aside')).toBeUndefined();
    expect(button('Throw')).toBeUndefined();
    expect(button('Draw')).toBeUndefined();
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
    expect(button('Draw')).toBeUndefined();
  });

  it('shows no reason to players who are not on turn', async () => {
    const { el } = await setup(1);
    expect(el.textContent).not.toContain('Not your turn');
  });

  it('names the next action for an empty selection', async () => {
    const { el } = await setup(0);
    expect(el.querySelector('.vl-next')?.textContent).toContain('Select at least one die');
  });

  it.each([2, 5, 8])('renders %i players', async (n) => {
    const players = Array.from({ length: n }, (_, i) => ({ name: `P${i}`, score: i }));
    const { el } = await setup(0, { game: { ...state(0), players } });
    expect(el.querySelectorAll('app-player-seat')).toHaveLength(n);
  });

  it('seats me first at the top left and marks the offline seat', async () => {
    const { el } = await setup(0);
    const seats = [...el.querySelectorAll('ul.vl-seats > li')];
    expect(seats.map((li) => li.className)).toEqual(['vl-area-l1', 'vl-area-r1']);
    expect(seats[0].textContent).toContain('Ann');
    expect(seats[0].textContent).toContain('You');
    expect(seats[1].textContent).toContain('Offline');
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

  describe('bonus Volle Lotte', () => {
    const decide = (over: object, current = 0) => ({
      game: {
        ...state(current),
        turn: { ...state(current).turn!, phase: 'decide', dice: [], ...over },
      },
    });

    it('lets the player draw the next card instead of banking', async () => {
      const { button } = await setup(0, decide({ free: 0, run: 700 }));
      expect(button('Draw')!.disabled).toBe(false);
    });

    it.each([
      ['dice are still free', { free: 2, card: 'bonus200' }],
      ['the card is not a bonus', { free: 0, card: 'star' }],
    ])('does not offer drawing when %s', async (_, over) => {
      const { button } = await setup(0, decide(over));
      expect(button('Draw')).toBeUndefined();
    });

    it('does not offer drawing to other players', async () => {
      const { button } = await setup(1, decide({ free: 0 }, 1));
      expect(button('Draw')).toBeUndefined();
    });
  });

  describe('Street', () => {
    const card = { kind: 'turn', seat: 0, data: { type: 'cardDrawn', card: 'street' } };
    const pick = (dice: number[]) => ({
      kind: 'turn',
      seat: 0,
      data: { type: 'selected', dice, points: 0 },
    });
    const street = (log: object[], collected: number[]) =>
      setup(0, {
        log,
        game: { ...state(0), turn: { ...state(0).turn!, card: 'street', street: collected } },
      });

    it('shows all six dice with the missing ones greyed out', async () => {
      const { el } = await street([card, pick([1]), pick([3])], [1, 3]);
      const faces = [...el.querySelectorAll('.vl-street > span')];
      expect(faces).toHaveLength(6);
      expect(faces.map((f) => f.classList.contains('vl-missing'))).toEqual([
        false,
        true,
        false,
        true,
        true,
        true,
      ]);
    });

    it('shows everything greyed out before the first pick', async () => {
      const { el } = await street([card], []);
      expect(el.querySelectorAll('.vl-street .vl-missing')).toHaveLength(6);
    });

    it('shows the points instead after a bust', async () => {
      const bust = { kind: 'turn', seat: 0, data: { type: 'bust', lost: 0 } };
      const { el } = await street([card, pick([1]), bust], [1]);
      expect(el.querySelector('.vl-street')).toBeNull();
    });

    it('shows the points on other cards', async () => {
      const { el } = await setup(0);
      expect(el.querySelector('.vl-street')).toBeNull();
    });
  });

  describe('rolling', () => {
    const thrown = { kind: 'turn', seat: 0, data: { type: 'thrown', dice: [6, 4] } };
    const logLen = (el: HTMLElement) => el.querySelectorAll('.vl-log li').length;
    async function throwOne(skip = false) {
      localStorage.setItem('vl-skip-dice', String(skip));
      const t = await setup(0);
      vi.useFakeTimers();
      t.socket.game.set({ ...t.socket.game()!, log: [thrown] } as never);
      t.fixture.detectChanges();
      return t;
    }
    afterEach(() => {
      vi.useRealTimers();
      localStorage.removeItem('vl-skip-dice');
    });

    it('holds back the log and locks actions until the last die stops (FR-010)', async () => {
      const { el, fixture, button } = await throwOne();
      expect(logLen(el)).toBe(0);
      expect(el.querySelector('.vl-roll-status')?.textContent).toContain('rolling');
      expect(button('Throw')).toBeUndefined();
      vi.advanceTimersByTime(5000);
      fixture.detectChanges();
      expect(logLen(el)).toBe(1);
      expect(el.querySelector('.vl-roll-status')?.textContent?.trim()).toBe('');
    });

    it('does not roll when animation is skipped', async () => {
      const { el } = await throwOne(true);
      expect(logLen(el)).toBe(1);
    });

    it('does not roll for history present at load (reload/reconnect)', async () => {
      const { el } = await setup(0, { log: [thrown] });
      expect(logLen(el)).toBe(1);
      expect(el.querySelector('.vl-roll-status')?.textContent?.trim()).toBe('');
    });
  });

  describe('computer turn', () => {
    const computerTable = (over = {}) =>
      setup(1, {
        seats: [human('p0', 'Ann'), { state: 'computer' }, { state: 'open' }, { state: 'open' }],
        ...over,
      });

    it('highlights the computer pick with a badge', async () => {
      const { el } = await computerTable({ preview: [0, 2] });
      expect(el.querySelectorAll('.vl-pick-badge')).toHaveLength(2);
    });

    it('shows no badge on a human turn', async () => {
      const { el } = await setup(0);
      expect(el.querySelectorAll('.vl-pick-badge')).toHaveLength(0);
    });

    it('rolls computer dice faster when the host enabled it', async () => {
      const { socket, el, fixture } = await computerTable({ fastComputerDice: true });
      vi.useFakeTimers();
      localStorage.setItem('vl-skip-dice', 'false');
      socket.game.set({ ...socket.game()!, log: [thrownLog] } as never);
      fixture.detectChanges();
      expect(el.querySelector('.vl-roll-status')?.textContent).toContain('rolling');
      vi.advanceTimersByTime(2500);
      fixture.detectChanges();
      expect(el.querySelector('.vl-roll-status')?.textContent?.trim()).toBe('');
      vi.useRealTimers();
      localStorage.removeItem('vl-skip-dice');
    });
  });

  it('shows the turn timer and the timeout warning', async () => {
    const { socket, el, fixture } = await setup(0);
    expect(el.querySelector('app-turn-timer')).toBeNull();
    const view = socket.game()!;
    socket.game.set({
      ...view,
      turnDeadline: { at: Date.now() + 10_000, phase: 'throw' },
      you: { ...view.you, timeoutWarning: true },
    } as never);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(el.querySelector('[aria-current=true] app-turn-timer')).not.toBeNull();
    expect(el.querySelectorAll('app-turn-timer')).toHaveLength(1);
    expect(el.querySelector('p-message')).toBeNull();
  });

  it('asks for confirmation before leaving', async () => {
    const { socket, el, fixture } = await setup(0);
    el.querySelector<HTMLButtonElement>('[aria-label="Leave game"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(socket.leave).not.toHaveBeenCalled();
    (document.body.querySelector('p-dialog button.p-button-danger') as HTMLButtonElement).click();
    expect(socket.leave).toHaveBeenCalled();
  });

  it('shows a new bank as a notice instead of a toast', async () => {
    const { socket, toasts, fixture } = await setup(0);
    const view = socket.game()!;
    socket.game.set({
      ...view,
      log: [{ kind: 'turn', seat: 0, data: { type: 'banked', points: 300 } }],
    } as never);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(toasts).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.vl-bust')?.textContent).toContain('banked 300');
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
