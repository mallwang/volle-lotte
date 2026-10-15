import { TestBed } from '@angular/core/testing';
import type { SeatView } from 'game-rules';
import { SocketService } from '../core/socket.service';
import { gameView, stubSocket } from '../core/testing';
import { DisconnectBanner } from './disconnect-banner';

const seats: SeatView[] = [
  { state: 'human', playerId: 'p0', nickname: 'Ann', connected: true },
  { state: 'human', playerId: 'p1', nickname: 'Bob', connected: false },
];

async function setup(host: boolean, pending: number[]) {
  const socket = stubSocket();
  const game = gameView(
    {
      hostId: host ? 'p0' : 'p1',
      pending,
      graceEndsAt: { 1: Date.now() + 42_000 },
    },
    seats,
  );
  TestBed.configureTestingModule({
    imports: [DisconnectBanner],
    providers: [{ provide: SocketService, useValue: socket }],
  });
  const fixture = TestBed.createComponent(DisconnectBanner);
  fixture.componentRef.setInput('game', game);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.includes(text));
  return { socket, el, button };
}

describe('DisconnectBanner', () => {
  it('shows the grace countdown without decision controls', async () => {
    const { el, button } = await setup(true, []);
    expect(el.textContent).toMatch(/Bob is disconnected\.\s+Reconnect window: (41|42) s/);
    expect(button('Free seat')).toBeUndefined();
  });

  it('gives the host the decision once the seat is pending', async () => {
    const { socket, button } = await setup(true, [1]);
    socket.send.mockResolvedValue({ ok: true });
    button('Replace with computer')!.click();
    expect(socket.send).toHaveBeenCalledWith('host:decide', {
      seat: 1,
      decision: 'computer',
      difficulty: 'medium',
    });
    button('Free seat')!.click();
    expect(socket.send).toHaveBeenCalledWith('host:decide', {
      seat: 1,
      decision: 'free',
      difficulty: undefined,
    });
  });

  it('tells non-hosts to wait', async () => {
    const { el, button } = await setup(false, [1]);
    expect(el.textContent).toContain('Waiting for the host');
    expect(button('Free seat')).toBeUndefined();
  });
});
