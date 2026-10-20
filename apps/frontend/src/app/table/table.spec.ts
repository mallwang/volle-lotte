import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { applyChange, encodeLog, type GameStateView, type SeatView } from 'game-rules';
import { LeaveGame } from '../core/leave-game';
import { SocketService, TOAST_MS } from '../core/socket.service';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { Celebration } from '../core/celebration';
import { Sounds } from '../core/sounds';
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

const sounds = { preload: vi.fn(), play: vi.fn(), stop: vi.fn(), muted: signal(false) };
const played = (cue: string) => sounds.play.mock.calls.filter(([c]) => c === cue).length;
beforeEach(() => {
  sounds.preload.mockClear();
  sounds.play.mockClear();
  sounds.stop.mockClear();
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
    providers: [
      providePrimeNG(),
      MessageService,
      { provide: SocketService, useValue: socket },
      { provide: LeaveGame, useValue: { request: vi.fn() } },
      { provide: Celebration, useValue: { preload: vi.fn(), start: vi.fn(), stop: vi.fn() } },
      { provide: Sounds, useValue: sounds },
    ],
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
  return { socket, el, button, fixture, toasts, leave: TestBed.inject(LeaveGame) };
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

  it('shows computer names from the game state and the renamed log entry', async () => {
    const view = state(0);
    const { el } = await setup(0, {
      game: { ...view, players: [view.players[0], { name: 'Rex', score: 200 }] },
      seats: [
        human('p0', 'Ann'),
        { state: 'computer', name: 'Rex', difficulty: 'easy', risk: 'medium' },
      ],
      log: [{ at: 1, kind: 'renamed', seat: 1, data: 'Brave Fox' }],
    });
    expect(el.textContent).toContain('Rex');
    expect(el.textContent).toContain('Brave Fox is now called Rex');
    expect(el.textContent).not.toMatch(/Computer \d/);
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

    it('never offers banking on Double Lotte, even above the minimum without carried points', async () => {
      const { button } = await setup(0, {
        game: {
          ...state(0),
          turn: { ...state(0).turn!, card: 'doubleLotte', phase: 'decide', free: 3, run: 1000 },
        },
        log: [
          { kind: 'turn', seat: 0, data: { type: 'cardDrawn', card: 'doubleLotte' } },
          { kind: 'turn', seat: 0, data: { type: 'selected', dice: [1, 1, 1], points: 1000 } },
        ],
      });
      expect(button('Bank')).toBeUndefined();
      expect(button('Throw')).toBeDefined();
    });

    it('previews bust odds between the dice and roll status, only when enabled', async () => {
      const { socket, fixture, el } = await setup(0);
      expect(el.querySelector('.vl-bust-probability')).toBeNull();
      socket.game.set({ ...socket.game()!, showBustProbability: true });
      fixture.detectChanges();
      expect(el.querySelector('.vl-bust-probability')).toBeNull();
      const dice = el.querySelectorAll<HTMLButtonElement>('[aria-label=Dice] button');
      dice[0].click();
      dice[1].click();
      fixture.detectChanges();
      const hint = el.querySelector('.vl-bust-probability')!;
      expect(hint.textContent).toContain('66.7%');
      expect(hint.nextElementSibling?.classList.contains('vl-roll-status')).toBe(true);
      socket.game.set({ ...socket.game()!, showBustProbability: false });
      fixture.detectChanges();
      expect(el.querySelector('.vl-bust-probability')).toBeNull();
    });

    it('lets the player draw the next card instead of banking', async () => {
      const { button } = await setup(0, decide({ free: 0, run: 700 }));
      expect(button('Draw')!.disabled).toBe(false);
    });

    it('offers banking after the Volle Lotte', async () => {
      const log = [
        { kind: 'turn', seat: 0, data: { type: 'cardDrawn', card: 'bonus200' } },
        {
          kind: 'turn',
          seat: 0,
          data: { type: 'selected', dice: [1, 1, 1, 5, 5, 5], points: 500 },
        },
        { kind: 'turn', seat: 0, data: { type: 'volleLotte' } },
      ];
      const { button } = await setup(0, { ...decide({ free: 0, run: 700 }), log });
      expect(button('Bank')!.disabled).toBe(false);
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

    it('rolls and reveals the log when the entries arrive as a game:change append', async () => {
      localStorage.setItem('vl-skip-dice', 'false');
      const t = await setup(0);
      vi.useFakeTimers();
      t.socket.game.set(applyChange(t.socket.game()!, { n: 1, log: encodeLog([thrown as never]) }));
      t.fixture.detectChanges();
      expect(logLen(t.el)).toBe(0);
      expect(t.el.querySelector('.vl-roll-status')?.textContent).toContain('rolling');
      vi.advanceTimersByTime(5000);
      t.fixture.detectChanges();
      expect(logLen(t.el)).toBe(1);
      // a change without log entries leaves the revealed log as it is
      t.socket.game.set(applyChange(t.socket.game()!, { n: 2, preview: [0] }));
      t.fixture.detectChanges();
      expect(logLen(t.el)).toBe(1);
      expect(t.el.querySelector('.vl-roll-status')?.textContent?.trim()).toBe('');
      const next = { ...thrown, data: { type: 'thrown', dice: [1, 2, 3] } };
      t.socket.game.set(applyChange(t.socket.game()!, { n: 3, log: encodeLog([next as never]) }));
      t.fixture.detectChanges();
      expect(logLen(t.el)).toBe(1);
      vi.advanceTimersByTime(5000);
      t.fixture.detectChanges();
      expect(logLen(t.el)).toBe(2);
    });

    it('does not roll when animation is skipped', async () => {
      const { el } = await throwOne(true);
      expect(logLen(el)).toBe(1);
    });

    it('holds back the dice of spectators who skip the animation', async () => {
      localStorage.setItem('vl-skip-dice', 'true');
      const t = await setup(0, {
        you: { playerId: 'v1', seat: -1, timeoutWarning: false, spectator: true },
        hostId: 'p0',
      });
      vi.useFakeTimers();
      t.socket.game.set({ ...t.socket.game()!, log: [thrown] } as never);
      t.fixture.detectChanges();
      expect(logLen(t.el)).toBe(0);
      expect(t.el.querySelector('.vl-roll-status')?.textContent).toContain('rolling');
      expect(t.el.querySelectorAll('.vl-dice .pip')).toHaveLength(0);
      vi.advanceTimersByTime(5000);
      t.fixture.detectChanges();
      expect(logLen(t.el)).toBe(1);
      expect(t.el.querySelectorAll('.vl-dice .pip').length).toBeGreaterThan(0);
    });

    it('does not roll for history present at load (reload/reconnect)', async () => {
      const { el } = await setup(0, { log: [thrown] });
      expect(logLen(el)).toBe(1);
      expect(el.querySelector('.vl-roll-status')?.textContent?.trim()).toBe('');
    });

    it('keeps the Star score unchanged until the final throw has stopped', async () => {
      localStorage.setItem('vl-skip-dice', 'false');
      const t = await setup(0, {
        game: {
          ...state(0),
          turn: { ...state(0).turn!, card: 'star', phase: 'decide', dice: [], free: 2, run: 300 },
        },
        log: [{ kind: 'turn', seat: 0, data: { type: 'cardDrawn', card: 'star' } }],
      });
      expect(t.el.querySelector('.vl-pseat-score')?.textContent).toContain('100');
      vi.useFakeTimers();
      t.socket.game.set({
        ...t.socket.game()!,
        game: {
          ...state(1),
          players: [
            { name: 'Ann', score: 400 },
            { name: 'Bob', score: 200 },
          ],
        },
        log: [
          { kind: 'turn', seat: 0, data: { type: 'cardDrawn', card: 'star' } },
          thrown,
          { kind: 'turn', seat: 0, data: { type: 'bust', lost: 0 } },
          { kind: 'turn', seat: 0, data: { type: 'banked', points: 300 } },
        ],
      } as never);
      t.fixture.detectChanges();
      expect(t.el.querySelector('.vl-roll-status')?.textContent).toContain('rolling');
      expect(t.el.querySelector('.vl-pseat-score')?.textContent).toContain('100');
      vi.advanceTimersByTime(3001);
      t.fixture.detectChanges();
      expect(t.el.querySelector('.vl-pseat-score')?.textContent).toContain('400');
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

  it('leaves through the shared confirmation, not directly', async () => {
    const { socket, leave, el } = await setup(0);
    el.querySelector<HTMLButtonElement>('[aria-label="Leave game"]')!.click();
    expect(leave.request).toHaveBeenCalled();
    expect(socket.leave).not.toHaveBeenCalled();
  });

  it('announces a new bank as a toast', async () => {
    const { socket, toasts, fixture } = await setup(0);
    const view = socket.game()!;
    socket.game.set({
      ...view,
      log: [{ kind: 'turn', seat: 0, data: { type: 'banked', points: 300 } }],
    } as never);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(toasts).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'success',
        summary: 'Banked',
        detail: expect.stringContaining('banked 300'),
      }),
    );
  });

  describe('turn notices', () => {
    const turn = (seat: number, data: object) => ({ kind: 'turn', seat, data });
    async function noticeFor(log: object[], over = {}) {
      const t = await setup(0, over);
      t.socket.game.set({ ...t.socket.game()!, log } as never);
      t.fixture.detectChanges();
      await t.fixture.whenStable();
      expect(t.el.querySelector('.vl-wait .vl-bust-timer')).not.toBeNull();
      return t.toasts.mock.calls.map(([m]) => `${m.summary} ${m.detail}`).join('\n');
    }

    it.each([
      [undefined, 3500],
      [5, 1500],
      [1, 8000],
    ])('shows the notice for the length of computer speed %s', async (speed, ms) => {
      const t = await setup(0, speed ? { computerSpeed: speed } : {});
      t.socket.game.set({ ...t.socket.game()!, log: [{ kind: 'timedOut', seat: 0 }] } as never);
      t.fixture.detectChanges();
      await t.fixture.whenStable();
      expect(t.toasts).toHaveBeenCalledWith(
        expect.objectContaining({ life: Math.max(ms, TOAST_MS) }),
      );
    });

    it('announces a timeout to the player', async () => {
      expect(await noticeFor([{ kind: 'timedOut', seat: 0 }])).toContain('You ran out of time.');
    });

    it('announces a timeout of another player', async () => {
      expect(await noticeFor([{ kind: 'timedOut', seat: 1 }])).toContain('ran out of time.');
    });

    it('warns the player who timed out again', async () => {
      const t = await setup(0);
      const view = t.socket.game()!;
      t.socket.game.set({
        ...view,
        you: { ...view.you, timeoutWarning: true },
        log: [{ kind: 'timedOut', seat: 0 }],
      } as never);
      t.fixture.detectChanges();
      await t.fixture.whenStable();
      expect(t.toasts).toHaveBeenCalledWith(
        expect.objectContaining({ detail: expect.stringContaining('One more') }),
      );
    });

    it('announces a Stop card without points at stake', async () => {
      const log = [turn(0, { type: 'cardDrawn', card: 'stop' })];
      expect(await noticeFor(log)).toContain('You drew the Stop card.');
    });

    it('announces the points lost to a Stop card', async () => {
      const log = [
        turn(0, { type: 'cardDrawn', card: 'stop' }),
        turn(0, { type: 'turnLost', lost: 400 }),
      ];
      expect(await noticeFor(log)).toContain('lost 400 points');
    });

    it('announces a bust after a throw', async () => {
      localStorage.setItem('vl-skip-dice', 'true');
      const log = [turn(0, { type: 'thrown', dice: [2, 3] }), turn(0, { type: 'bust', lost: 0 })];
      expect(await noticeFor(log)).toContain('went bust');
      localStorage.removeItem('vl-skip-dice');
    });

    it('announces only the bank when Star ends with a miss', async () => {
      localStorage.setItem('vl-skip-dice', 'true');
      const log = [
        turn(0, { type: 'thrown', dice: [2, 3] }),
        turn(0, { type: 'bust', lost: 0 }),
        turn(0, { type: 'banked', points: 300 }),
      ];
      const text = await noticeFor(log);
      expect(text).toContain('banked 300');
      expect(text).not.toContain('bust');
      localStorage.removeItem('vl-skip-dice');
    });
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

describe('Table sounds', () => {
  const pass = (t: Awaited<ReturnType<typeof setup>>, current: number, over = {}) => {
    t.socket.game.set({ ...t.socket.game()!, game: state(current), ...over } as never);
    t.fixture.detectChanges();
  };
  afterEach(() => vi.useRealTimers());

  it('preloads the sounds when the table opens', async () => {
    await setup(0);
    expect(sounds.preload).toHaveBeenCalled();
  });

  describe('your turn', () => {
    it('stays silent when the table opens on my turn (start and reload)', async () => {
      await setup(0);
      expect(played('your-turn')).toBe(0);
    });

    it('plays once when the turn passes to me', async () => {
      const t = await setup(1);
      pass(t, 0);
      await t.fixture.whenStable();
      expect(played('your-turn')).toBe(1);
      pass(t, 0, { n: 5 });
      expect(played('your-turn')).toBe(1);
    });

    it('waits for the previous turn notice to end', async () => {
      const t = await setup(1);
      vi.useFakeTimers();
      pass(t, 0, { log: [{ kind: 'timedOut', seat: 1 }] });
      expect(t.el.querySelector('.vl-wait .vl-bust-timer')).not.toBeNull();
      expect(played('your-turn')).toBe(0);
      vi.advanceTimersByTime(20_000);
      t.fixture.detectChanges();
      expect(played('your-turn')).toBe(1);
    });

    it('waits for the last dice of the previous turn to stop', async () => {
      localStorage.setItem('vl-skip-dice', 'false');
      const t = await setup(1);
      vi.useFakeTimers();
      pass(t, 0, { log: [{ kind: 'turn', seat: 1, data: { type: 'thrown', dice: [2, 3] } }] });
      expect(t.el.querySelector('.vl-roll-status')?.textContent).toContain('rolling');
      expect(played('your-turn')).toBe(0);
      vi.advanceTimersByTime(5000);
      t.fixture.detectChanges();
      expect(played('your-turn')).toBe(1);
      localStorage.removeItem('vl-skip-dice');
    });

    it('does not play again after my own roll', async () => {
      localStorage.setItem('vl-skip-dice', 'false');
      const t = await setup(1);
      vi.useFakeTimers();
      pass(t, 0);
      expect(played('your-turn')).toBe(1);
      t.socket.game.set({
        ...t.socket.game()!,
        log: [{ kind: 'turn', seat: 0, data: { type: 'thrown', dice: [2, 3] } }],
      } as never);
      t.fixture.detectChanges();
      vi.advanceTimersByTime(5000);
      t.fixture.detectChanges();
      expect(played('your-turn')).toBe(1);
      localStorage.removeItem('vl-skip-dice');
    });

    it('is silent for a turn change between two other seats', async () => {
      const t = await setup(1, {
        seats: [human('p0', 'Ann'), human('p1', 'Bob'), human('p2', 'Cy'), { state: 'open' }],
        game: {
          ...state(1),
          players: [...state(1).players, { name: 'Cy', score: 0 }],
        },
      });
      t.socket.game.set({
        ...t.socket.game()!,
        game: { ...t.socket.game()!.game!, current: 2 },
      } as never);
      t.fixture.detectChanges();
      expect(played('your-turn')).toBe(0);
    });

    it('is silent for a spectator', async () => {
      const t = await setup(0, {
        you: { playerId: 'v1', seat: -1, timeoutWarning: false, spectator: true },
      });
      pass(t, 1, { you: { playerId: 'v1', seat: -1, timeoutWarning: false, spectator: true } });
      pass(t, 0, { you: { playerId: 'v1', seat: -1, timeoutWarning: false, spectator: true } });
      expect(played('your-turn')).toBe(0);
    });
  });

  describe('countdown', () => {
    const withDeadline = (t: Awaited<ReturnType<typeof setup>>, at: number | null) => {
      const view = t.socket.game()!;
      t.socket.game.set({
        ...view,
        turnDeadline: at === null ? undefined : { at, phase: 'throw' },
      } as never);
      t.fixture.detectChanges();
    };

    it('beeps once a second in the last five seconds of my timer', async () => {
      const t = await setup(0);
      vi.useFakeTimers();
      withDeadline(t, Date.now() + 30_000);
      vi.advanceTimersByTime(24_999);
      expect(played('countdown')).toBe(0);
      vi.advanceTimersByTime(1);
      expect(played('countdown')).toBe(1);
      vi.advanceTimersByTime(10_000);
      expect(played('countdown')).toBe(5);
    });

    it('waits five seconds into a 10 second step', async () => {
      const t = await setup(0);
      vi.useFakeTimers();
      withDeadline(t, Date.now() + 10_000);
      vi.advanceTimersByTime(4_999);
      expect(played('countdown')).toBe(0);
      vi.advanceTimersByTime(1);
      expect(played('countdown')).toBe(1);
    });

    it('stops the beeps when the deadline changes and arms the new timer', async () => {
      const t = await setup(0);
      vi.useFakeTimers();
      withDeadline(t, Date.now() + 12_000);
      vi.advanceTimersByTime(8_500);
      expect(played('countdown')).toBe(2);
      withDeadline(t, Date.now() + 30_000);
      vi.advanceTimersByTime(24_000);
      expect(played('countdown')).toBe(2);
      vi.advanceTimersByTime(6_000);
      expect(played('countdown')).toBe(7);
    });

    it('plays nothing more once the deadline is cleared (pause)', async () => {
      const t = await setup(0);
      vi.useFakeTimers();
      withDeadline(t, Date.now() + 12_000);
      vi.advanceTimersByTime(8_000);
      const before = played('countdown');
      withDeadline(t, null);
      vi.advanceTimersByTime(20_000);
      expect(played('countdown')).toBe(before);
    });

    it("is silent for another player's deadline", async () => {
      const t = await setup(1);
      vi.useFakeTimers();
      withDeadline(t, Date.now() + 12_000);
      vi.advanceTimersByTime(20_000);
      expect(played('countdown')).toBe(0);
    });

    it('is silent in a game without a turn timer', async () => {
      const t = await setup(0);
      vi.useFakeTimers();
      vi.advanceTimersByTime(60_000);
      expect(played('countdown')).toBe(0);
      expect(t.socket.game()!.turnDeadline).toBeUndefined();
    });

    it('cancels pending beeps when the table is destroyed', async () => {
      const t = await setup(0);
      vi.useFakeTimers();
      withDeadline(t, Date.now() + 12_000);
      t.fixture.destroy();
      vi.advanceTimersByTime(20_000);
      expect(played('countdown')).toBe(0);
    });
  });

  describe('Volle Lotte', () => {
    const lotte = (seat: number) => ({ kind: 'turn', seat, data: { type: 'volleLotte' } });
    const thrownMine = { kind: 'turn', seat: 0, data: { type: 'thrown', dice: [1, 1, 1] } };

    afterEach(() => localStorage.removeItem('vl-skip-dice'));

    it('plays after my roll animation, not while the dice roll', async () => {
      localStorage.setItem('vl-skip-dice', 'false');
      const t = await setup(0);
      vi.useFakeTimers();
      t.socket.game.set({ ...t.socket.game()!, log: [thrownMine, lotte(0)] } as never);
      t.fixture.detectChanges();
      expect(played('volle-lotte')).toBe(0);
      vi.advanceTimersByTime(5000);
      t.fixture.detectChanges();
      expect(played('volle-lotte')).toBe(1);
    });

    it('plays at once when the dice animation is skipped', async () => {
      localStorage.setItem('vl-skip-dice', 'true');
      const t = await setup(0);
      t.socket.game.set({ ...t.socket.game()!, log: [thrownMine, lotte(0)] } as never);
      t.fixture.detectChanges();
      expect(played('volle-lotte')).toBe(1);
    });

    it("is silent for another seat's Volle Lotte", async () => {
      localStorage.setItem('vl-skip-dice', 'true');
      const t = await setup(0);
      t.socket.game.set({ ...t.socket.game()!, log: [lotte(1)] } as never);
      t.fixture.detectChanges();
      expect(played('volle-lotte')).toBe(0);
    });

    it('is silent for entries already in the log when the table opened', async () => {
      await setup(0, { log: [lotte(0)] });
      expect(played('volle-lotte')).toBe(0);
    });
  });

  describe('points', () => {
    const banked = (seat: number) => ({
      kind: 'turn',
      seat,
      data: { type: 'banked', points: 300 },
    });
    const thrown = (seat: number) => ({
      kind: 'turn',
      seat,
      data: { type: 'thrown', dice: [1, 1, 1] },
    });

    beforeEach(() => localStorage.setItem('vl-skip-dice', 'true'));
    afterEach(() => localStorage.removeItem('vl-skip-dice'));

    async function logged(log: unknown[], over = {}) {
      const t = await setup(1, over);
      t.socket.game.set({ ...t.socket.game()!, log } as never);
      t.fixture.detectChanges();
      return t;
    }

    it('plays once for my own bank, with the notice', async () => {
      await logged([banked(0)]);
      expect(played('points')).toBe(1);
    });

    it('plays after my roll animation, not while the dice roll', async () => {
      localStorage.setItem('vl-skip-dice', 'false');
      const t = await setup(1);
      vi.useFakeTimers();
      t.socket.game.set({ ...t.socket.game()!, log: [thrown(0), banked(0)] } as never);
      t.fixture.detectChanges();
      expect(played('points')).toBe(0);
      vi.advanceTimersByTime(5000);
      t.fixture.detectChanges();
      expect(played('points')).toBe(1);
    });

    it("is silent for another seat's bank", async () => {
      await logged([banked(1)]);
      expect(played('points')).toBe(0);
    });

    it('is silent for a bust and a timeout', async () => {
      await logged([
        { kind: 'turn', seat: 0, data: { type: 'bust', lost: 100 } },
        { kind: 'timedOut', seat: 0 },
      ]);
      expect(played('points')).toBe(0);
    });

    it('is silent for the bank that ends the game', async () => {
      await logged([banked(0)], { game: { ...state(1), result: { winner: 0 } } });
      expect(played('points')).toBe(0);
    });

    it('is silent for entries already in the log when the table opened', async () => {
      await setup(1, { log: [banked(0)] });
      expect(played('points')).toBe(0);
    });

    it('plays together with the applause after a Volle Lotte', async () => {
      await logged([{ kind: 'turn', seat: 0, data: { type: 'volleLotte' } }, banked(0)]);
      expect(played('volle-lotte')).toBe(1);
      expect(played('points')).toBe(1);
    });
  });
});

describe('Table for spectators', () => {
  const watching = {
    you: { playerId: 'v1', seat: -1, timeoutWarning: false, spectator: true },
    hostId: 'p0',
  };

  it('is read-only: banner, tag, scores and log, no play controls, no removed notice', async () => {
    const { el, button, socket } = await setup(0, watching);
    expect(el.textContent).toContain('You are watching this game');
    expect(el.textContent).toContain('Watching');
    expect(el.textContent).toContain('Ann');
    expect(el.textContent).toContain('Bob');
    expect(button('Set aside')).toBeUndefined();
    expect(button('Throw')).toBeUndefined();
    expect(button('Bank')).toBeUndefined();
    expect(button('Pause')).toBeUndefined();
    expect(document.body.textContent).not.toContain('took over');
    const dice = el.querySelectorAll<HTMLButtonElement>('[aria-label=Dice] button');
    dice.forEach((d) => d.click());
    expect(socket.send).not.toHaveBeenCalled();
  });

  it('leaves through the shared leave request without a confirmation of its own', async () => {
    const { el, leave } = await setup(0, watching);
    (el.querySelector('[aria-label="Leave game"]') as HTMLButtonElement).click();
    expect(leave.request).toHaveBeenCalled();
  });

  it('shows the counter to players and spectators, muted at 0, with singular and plural', async () => {
    const zero = await setup(0, { spectators: 0 });
    const chip = () => zero.el.querySelector<HTMLElement>('.vl-spectators')!;
    expect(chip().textContent).toContain('0 spectators');
    expect(chip().classList.contains('vl-spectators-none')).toBe(true);
    expect(chip().getAttribute('aria-label')).toBe('Spectators: 0');
    zero.socket.game.update((g) => ({ ...g!, spectators: 1 }));
    zero.fixture.detectChanges();
    expect(chip().textContent).toContain('1 spectator');
    expect(chip().textContent).not.toContain('1 spectators');
    zero.socket.game.update((g) => ({ ...g!, spectators: 3 }));
    zero.fixture.detectChanges();
    expect(chip().textContent).toContain('3 spectators');
    expect(zero.el.textContent).not.toContain('You are watching');
  });

  it('hides the counter when the host turned spectating off', async () => {
    const { el } = await setup(0, { spectating: false, spectators: 0 });
    expect(el.querySelector('.vl-spectators')).toBeNull();
  });

  it('raises no toast when only the spectator count changes', async () => {
    const { socket, toasts, fixture } = await setup(0);
    socket.game.update((g) => ({ ...g!, spectators: 2 }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(toasts).not.toHaveBeenCalled();
  });
});
