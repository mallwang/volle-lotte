import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { GameSummary } from 'game-rules';
import { SocketService } from '../core/socket.service';
import { stubSocket } from '../core/testing';
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
  phase: 'lobby',
};

async function setup() {
  const socket = stubSocket();
  socket.games.set([summary] as never);
  TestBed.configureTestingModule({
    imports: [Lobby],
    providers: [
      providePrimeNG(),
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
  return { socket, el, tryJoin, fixture, settle };
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
