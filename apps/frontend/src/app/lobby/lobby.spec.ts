import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { GameSummary } from 'game-rules';
import { SocketService } from '../core/socket.service';
import { stubSocket } from '../core/testing';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { expectNoA11yViolations, inBothModes } from '../core/testing';
import { Lobby } from './lobby';

const summary: GameSummary = {
  id: 'g1',
  name: 'Table One',
  host: 'Ann',
  targetScore: 6000,
  seatsUsed: 1,
  seatsTotal: 4,
  protected: true,
  rejoinable: false,
  banned: false,
  closable: false,
  phase: 'lobby',
};

async function setup() {
  const socket = stubSocket();
  socket.games.set([summary] as never);
  TestBed.configureTestingModule({
    imports: [Lobby],
    providers: [
      providePrimeNG(),
      ConfirmationService,
      MessageService,
      provideRouter([{ path: '**', children: [] }]),
      { provide: SocketService, useValue: socket },
    ],
  });
  const fixture = TestBed.createComponent(Lobby);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const settle = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const tryJoin = async () => {
    el.querySelector('button')!.click();
    await settle();
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle();
  };
  const confirmation = TestBed.inject(ConfirmationService);
  const messages = TestBed.inject(MessageService);
  return { socket, el, tryJoin, fixture, settle, confirmation, messages };
}

describe('Lobby', () => {
  it('lists games with host and seats', async () => {
    const { el } = await setup();
    expect(el.querySelector('li')?.textContent).toContain('Table One');
    expect(el.querySelector('li')?.textContent).toContain('1/4');
    expect(el.querySelector('p-tag')?.textContent).toContain('3 free');
  });

  it('opens the password dialog on join', async () => {
    const { el, settle } = await setup();
    el.querySelector('button')!.click();
    await settle();
    expect(el.querySelector('[role=dialog]')?.textContent).toContain('Password for Table One');
  });

  it('joins an open game with one tap', async () => {
    const { socket, el, settle } = await setup();
    socket.games.set([{ ...summary, protected: false }] as never);
    socket.join.mockResolvedValue({ ok: true, game: { id: 'g1' } });
    await settle();
    el.querySelector('button')!.click();
    await settle();
    expect(socket.join).toHaveBeenCalledWith({ gameId: 'g1', password: '' });
    expect(el.querySelector('[role=dialog]')).toBeNull();
  });

  it('offers a rejoin button for a running game the player left', async () => {
    const { socket, el, settle } = await setup();
    socket.games.set([{ ...summary, phase: 'running', rejoinable: true }] as never);
    socket.rejoin.mockResolvedValue({ ok: true, game: { id: 'g1' } });
    await settle();
    el.querySelector('button')!.click();
    await settle();
    expect(socket.rejoin).toHaveBeenCalledWith('g1');
  });

  describe('ending an abandoned game', () => {
    const abandoned = { ...summary, host: '', phase: 'running', rejoinable: true, closable: true };
    const confirmEnd = async (
      setupResult: Awaited<ReturnType<typeof setup>>,
      action: 'accept' | 'reject',
    ) => {
      const { el, settle, confirmation } = setupResult;
      const confirm = vi.spyOn(confirmation, 'confirm');
      [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('End game'))!.click();
      await settle();
      const options = confirm.mock.calls[0][0];
      options[action]!();
      await settle();
      return options;
    };

    it('shows the end button next to rejoin and says that nobody hosts', async () => {
      const { socket, el, settle } = await setup();
      socket.games.set([abandoned] as never);
      await settle();
      const labels = [...el.querySelectorAll('button')].map((b) => b.textContent?.trim());
      expect(labels).toEqual(['Rejoin', 'End game']);
      expect(el.textContent).toContain('No host, only computers left');
    });

    it('offers no end button when the player may not end the game', async () => {
      const { socket, el, settle } = await setup();
      socket.games.set([{ ...abandoned, closable: false }] as never);
      await settle();
      expect(el.textContent).not.toContain('End game');
    });

    it('asks first and ends the game only after confirmation', async () => {
      const ctx = await setup();
      ctx.socket.games.set([abandoned] as never);
      ctx.socket.end.mockResolvedValue({ ok: true });
      await ctx.settle();
      const options = await confirmEnd(ctx, 'accept');
      expect(options.message).toContain('Only computers are left in "Table One"');
      expect(ctx.socket.end).toHaveBeenCalledWith('g1');
      expect(ctx.el.querySelector('[role=alert]')).toBeNull();
    });

    it('does nothing when the confirmation is declined', async () => {
      const ctx = await setup();
      ctx.socket.games.set([abandoned] as never);
      await ctx.settle();
      await confirmEnd(ctx, 'reject');
      expect(ctx.socket.end).not.toHaveBeenCalled();
    });

    it('names the new host when another player took over in the meantime', async () => {
      const ctx = await setup();
      ctx.socket.games.set([abandoned] as never);
      ctx.socket.end.mockResolvedValue({ ok: false, reason: 'notHost' });
      ctx.socket.refreshLobby.mockImplementation(async () => {
        ctx.socket.games.set([{ ...abandoned, host: 'Bob', closable: false }] as never);
      });
      await ctx.settle();
      const add = vi.spyOn(ctx.messages, 'add');
      await confirmEnd(ctx, 'accept');
      const text = 'You are no longer the host of "Table One": Bob rejoined and is the new host.';
      expect(ctx.el.querySelector('[role=alert]')?.textContent).toContain(text);
      expect(add).toHaveBeenCalledWith({
        severity: 'warn',
        detail: expect.stringContaining(text),
        life: 10_000,
      });
      expect(ctx.el.textContent).not.toContain('End game');
    });

    it('closes the confirmation and explains it when the host changes while it is open', async () => {
      const ctx = await setup();
      ctx.socket.games.set([abandoned] as never);
      await ctx.settle();
      const close = vi.spyOn(ctx.confirmation, 'close');
      const add = vi.spyOn(ctx.messages, 'add');
      vi.spyOn(ctx.confirmation, 'confirm');
      [...ctx.el.querySelectorAll('button')]
        .find((b) => b.textContent?.includes('End game'))!
        .click();
      await ctx.settle();
      ctx.socket.games.set([{ ...abandoned, host: 'Bob', closable: false }] as never);
      await ctx.settle();
      expect(close).toHaveBeenCalled();
      expect(add).toHaveBeenCalledWith(expect.objectContaining({ life: 10_000 }));
      expect(ctx.el.querySelector('[role=alert]')?.textContent).toContain('Bob rejoined');
    });
  });

  it('offers no join for running or full games', async () => {
    const { socket, el, settle } = await setup();
    socket.games.set([
      { ...summary, phase: 'running' },
      { ...summary, id: 'g2', seatsUsed: 4 },
    ] as never);
    await settle();
    expect(el.querySelector('button')).toBeNull();
  });

  it('shows an empty state', async () => {
    const { socket, el, settle } = await setup();
    socket.games.set([] as never);
    await settle();
    expect(el.textContent).toContain('No open games.');
  });

  it('has no a11y violations in both modes', async () => {
    const { fixture } = await setup();
    await inBothModes(fixture, () => expectNoA11yViolations(fixture));
  });

  it('shows attempts left after a wrong password', async () => {
    const { socket, el, tryJoin } = await setup();
    socket.join.mockResolvedValue({ ok: false, reason: 'wrongPassword', attemptsLeft: 2 });
    await tryJoin();
    expect(el.querySelector('[role=alert]')?.textContent).toContain('2 attempts left');
  });

  it('shows a lock countdown and disables joining', async () => {
    const { socket, el, tryJoin } = await setup();
    socket.join.mockResolvedValue({ ok: false, reason: 'locked', retryAfterMs: 30000 });
    await tryJoin();
    expect(el.querySelector('[role=status]')?.textContent).toContain('30 s');
    expect(el.querySelector<HTMLButtonElement>('form button')!.disabled).toBe(true);
  });
});
