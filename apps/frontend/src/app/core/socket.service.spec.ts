import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { vi } from 'vitest';
import { SOCKET, STORAGE_KEY, SocketService, type SocketLike } from './socket.service';

class FakeSocket implements SocketLike {
  connected = true;
  handlers = new Map<string, (...a: never[]) => void>();
  sent: { event: string; payload: unknown }[] = [];
  replies: Record<string, unknown> = {};
  on(event: string, l: (...a: never[]) => void) {
    this.handlers.set(event, l);
  }
  emit(event: string, payload: unknown, ack: (r: unknown) => void) {
    this.sent.push({ event, payload });
    ack(this.replies[event] ?? { ok: true, games: [] });
  }
  connect() {
    this.connected = true;
  }
  fire(event: string, arg?: unknown) {
    (this.handlers.get(event) as (a?: unknown) => void)(arg);
  }
}

const started = { ok: true, token: 't1', playerId: 'p1', nickname: 'Ann', protocolVersion: 2 };
const game = { id: 'g1' };

function setup(stored?: object) {
  localStorage.clear();
  if (stored) localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  const socket = new FakeSocket();
  TestBed.configureTestingModule({
    providers: [{ provide: SOCKET, useValue: socket }, MessageService],
  });
  const add = vi.spyOn(TestBed.inject(MessageService), 'add');
  return { socket, add, service: TestBed.inject(SocketService) };
}

describe('SocketService', () => {
  it('stores the token and exposes the session', async () => {
    const { socket, service } = setup();
    socket.replies['session:start'] = started;
    expect((await service.start('Ann')).ok).toBe(true);
    expect(service.session()).toEqual({ playerId: 'p1', nickname: 'Ann' });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({
      token: 't1',
      nickname: 'Ann',
    });
  });

  it('sends the host setting as game:settings', () => {
    const { socket, service } = setup();
    void service.settings(true);
    expect(socket.sent).toContainEqual({
      event: 'game:settings',
      payload: { fastComputerDice: true },
    });
  });

  it('keeps the session empty on an error ack', async () => {
    const { socket, service } = setup();
    socket.replies['session:start'] = { ok: false, reason: 'nicknameTaken' };
    expect((await service.start('Ann')).ok).toBe(false);
    expect(service.session()).toBeNull();
  });

  it('replays session:start with the token on reconnect', async () => {
    const { socket, service } = setup();
    socket.replies['session:start'] = { ...started, game };
    await service.start('Ann');
    socket.sent.length = 0;
    socket.fire('disconnect');
    expect(service.connection()).toBe('disconnected');
    socket.fire('connect');
    expect(socket.sent[0]).toMatchObject({
      event: 'session:start',
      payload: { token: 't1', nickname: 'Ann' },
    });
    expect(service.connection()).toBe('connected');
  });

  it('tells the user when a restarted server has no game', async () => {
    const { socket, add, service } = setup();
    socket.replies['session:start'] = { ...started, game };
    await service.start('Ann');
    socket.replies['session:start'] = started;
    socket.fire('connect');
    await vi.waitFor(() =>
      expect(add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'warn', detail: expect.stringContaining('restarted') }),
      ),
    );
    expect(service.game()).toBeNull();
  });

  it('handles session:replaced and game:closed', async () => {
    const { socket, add, service } = setup();
    socket.replies['session:start'] = { ...started, game };
    await service.start('Ann');
    socket.fire('game:closed');
    expect(service.game()).toBeNull();
    expect(add).toHaveBeenCalledWith({
      severity: 'info',
      detail: 'The game was closed.',
      life: 4000,
    });
    socket.fire('session:replaced');
    expect(service.session()).toBeNull();
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'warn', detail: expect.stringContaining('another') }),
    );
    socket.sent.length = 0;
    socket.fire('connect');
    expect(socket.sent).toEqual([]);
  });

  it('applies game:state and lobby:games pushes', () => {
    const { socket, service } = setup();
    socket.fire('game:state', { game });
    socket.fire('lobby:games', { games: [{ id: 'x' }] });
    expect(service.game()).toEqual(game);
    expect(service.games()).toHaveLength(1);
  });

  it('resumes a stored identity', async () => {
    const { socket, service } = setup({ token: 'old', nickname: 'Bob' });
    socket.replies['session:start'] = { ...started, nickname: 'Bob' };
    expect(await service.resume()).toBe(true);
    expect(socket.sent[0].payload).toMatchObject({ token: 'old', nickname: 'Bob' });
  });
});
