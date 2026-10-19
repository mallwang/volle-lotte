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

  describe('after a rematch', () => {
    const reserved: SeatView = { state: 'reserved', nickname: 'Bob' };

    it('shows a reserved seat with a tag and the round', async () => {
      const { el } = await setup(gameView({ round: 2 }, [me(true), reserved]));
      expect(el.textContent).toContain('Rematch · round 2');
      expect(el.textContent).toContain('Bob');
      expect(el.textContent).toContain('Reserved, not back yet');
      expect(el.querySelector('.vl-seat-reserved')).not.toBeNull();
    });

    it('does not show the round tag in the first game', async () => {
      const { el } = await setup(gameView({}, [me(true), other(true)]));
      expect(el.textContent).not.toContain('Rematch · round');
    });

    it('lets the host remove a reserved player and start without them', async () => {
      const { socket, button, el } = await setup(
        gameView({ round: 2 }, [me(true), reserved, other(true)]),
      );
      socket.send.mockResolvedValue({ ok: true });
      expect((button('Start game') as HTMLButtonElement).disabled).toBe(false);
      expect(el.textContent).toContain('Starting now drops the seat of Bob.');
      button('Remove this player')!.click();
      expect(socket.send).toHaveBeenCalledWith('seat:remove', { seat: 1 });
    });

    it('does not offer removal to a guest and shows no start hint', async () => {
      const { button, el } = await setup(
        gameView(
          { round: 2, hostId: 'p1', you: { playerId: 'p0', seat: 0, timeoutWarning: false } },
          [me(true), other(true), reserved],
        ),
      );
      expect(button('Remove this player')).toBeUndefined();
      expect(el.textContent).not.toContain('Starting now drops');
    });
  });

  it('counts computers as ready', async () => {
    const { button } = await setup(
      gameView({}, [me(true), { state: 'computer', difficulty: 'easy', risk: 'medium' }]),
    );
    expect((button('Start game') as HTMLButtonElement).disabled).toBe(false);
  });

  it('gives each computer seat a skill and a risk select, sent together', async () => {
    const { socket, el } = await setup(
      gameView({}, [me(true), { state: 'computer', difficulty: 'hard', risk: 'none' }]),
    );
    socket.send.mockResolvedValue({ ok: true });
    const skill = el.querySelector<HTMLSelectElement>('select[aria-label="Difficulty seat 2"]')!;
    const risk = el.querySelector<HTMLSelectElement>('select[aria-label="Risk seat 2"]')!;
    expect(skill.value).toBe('hard');
    expect(risk.value).toBe('none');
    expect([...risk.options].map((o) => o.value)).toEqual(['none', 'medium', 'high', 'random']);
    risk.value = 'high';
    risk.dispatchEvent(new Event('change'));
    expect(socket.send).toHaveBeenCalledWith('seat:set', {
      seat: 1,
      mode: 'computer',
      difficulty: 'hard',
      risk: 'high',
    });
    skill.value = 'easy';
    skill.dispatchEvent(new Event('change'));
    expect(socket.send).toHaveBeenLastCalledWith('seat:set', {
      seat: 1,
      mode: 'computer',
      difficulty: 'easy',
      risk: 'none',
    });
  });

  it('adds a computer with medium skill and medium risk', async () => {
    const { socket, button } = await setup(gameView({}, [me(true), { state: 'open' }]));
    socket.send.mockResolvedValue({ ok: true });
    button('Add computer')!.click();
    expect(socket.send).toHaveBeenCalledWith('seat:set', {
      seat: 1,
      mode: 'computer',
      difficulty: 'medium',
      risk: 'medium',
    });
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
        { state: 'computer', difficulty: 'easy', risk: 'medium' },
        { state: 'locked' },
        { state: 'open' },
      ]),
    );
    for (const t of ['Ready', 'Computer (easy, medium risk)', 'Locked', 'Free'])
      expect(el.textContent).toContain(t);
    expect(el.querySelectorAll('p-tag .pi').length).toBeGreaterThanOrEqual(4);
  });

  it('shows the name the server gave each computer, never a numbered label', async () => {
    const { el } = await setup(
      gameView({}, [
        me(true),
        { state: 'computer', name: 'Brave Fox', difficulty: 'easy', risk: 'medium' },
        { state: 'computer', name: 'Mutiges Kaninchen', difficulty: 'hard', risk: 'none' },
      ]),
    );
    const names = [...el.querySelectorAll<HTMLInputElement>('.vl-rename input')].map(
      (i) => i.value,
    );
    expect(names).toEqual(['Brave Fox', 'Mutiges Kaninchen']);
    expect(el.textContent).not.toMatch(/Computer \d/);
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

describe('GameLobby computer names', () => {
  const computer = {
    state: 'computer',
    name: 'Brave Fox',
    difficulty: 'easy',
    risk: 'medium',
  } as const;

  async function setupNames(playerId = 'p0') {
    const ctx = await setup(
      gameView({ you: { playerId, seat: 0, timeoutWarning: false } }, [me(false), computer]),
    );
    const input = () => ctx.el.querySelector<HTMLInputElement>('.vl-rename input')!;
    const type = async (value: string) => {
      input().value = value;
      input().dispatchEvent(new Event('input', { bubbles: true }));
      ctx.fixture.detectChanges();
      await ctx.fixture.whenStable();
    };
    return { ...ctx, input, type };
  }

  it('shows the name in an input for the host and renames on submit', async () => {
    const { socket, el, input, type } = await setupNames();
    socket.send.mockResolvedValue({ ok: true });
    expect(input().value).toBe('Brave Fox');
    await type('  Rex ');
    el.querySelector('.vl-rename')!.dispatchEvent(new Event('submit'));
    expect(socket.send).toHaveBeenCalledWith('seat:rename', { seat: 1, name: 'Rex' });
  });

  it('rolls a new name without sending one', async () => {
    const { socket, el } = await setupNames();
    socket.send.mockResolvedValue({ ok: true });
    el.querySelector<HTMLButtonElement>('.vl-rename button')!.click();
    expect(socket.send).toHaveBeenCalledWith('seat:rename', { seat: 1, name: undefined });
  });

  it('explains a rejection and keeps the draft', async () => {
    const { socket, el, input, type, fixture } = await setupNames();
    socket.send.mockResolvedValue({ ok: false, reason: 'nicknameTaken' });
    await type('Rex');
    el.querySelector('.vl-rename')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelector('.vl-rename-error')?.textContent).toContain('already used');
    expect(input().value).toBe('Rex');
  });

  it('shows guests the plain name', async () => {
    const { el } = await setupNames('p9');
    expect(el.querySelector('.vl-rename')).toBeNull();
    expect(el.textContent).toContain('Brave Fox');
  });

  it('has no a11y violations in both modes', async () => {
    const { fixture } = await setupNames();
    await inBothModes(fixture, () => expectNoA11yViolations(fixture));
  });
});
