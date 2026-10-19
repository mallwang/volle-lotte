import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { vi } from 'vitest';
import { I18nService } from './i18n.service';
import { SOCKET, STORAGE_KEY, SocketService, TOAST_MS, type SocketLike } from './socket.service';

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

  it('sends the host settings as game:settings', () => {
    const { socket, service } = setup();
    void service.settings({ fastComputerDice: true });
    void service.settings({ computerSpeed: 4 });
    expect(socket.sent).toContainEqual({
      event: 'game:settings',
      payload: { fastComputerDice: true },
    });
    expect(socket.sent).toContainEqual({ event: 'game:settings', payload: { computerSpeed: 4 } });
  });

  it('reports rejected host settings instead of silently ignoring them', async () => {
    const { socket, service, add } = setup();
    socket.replies['game:settings'] = { ok: false, reason: 'notHost' };
    expect(await service.settings({ showBustProbability: true })).toEqual({
      ok: false,
      reason: 'notHost',
    });
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error', detail: 'Only the host can do this.' }),
    );
  });

  describe('game:settingsChanged', () => {
    it('shows one toast per change entry', () => {
      const { socket, add } = setup();
      socket.fire('game:settingsChanged', {
        by: 'Ann',
        changes: [
          { setting: 'computerSpeed', value: 4 },
          { setting: 'fastComputerDice', value: true },
        ],
      });
      expect(add).toHaveBeenCalledTimes(2);
      expect(add).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          severity: 'info',
          life: TOAST_MS,
          detail: 'Ann set the computer speed to 4 (Fast).',
        }),
      );
      expect(add).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ detail: 'Ann turned fast computer dice on.' }),
      );
    });

    it('says when fast computer dice are turned off', () => {
      const { socket, add } = setup();
      socket.fire('game:settingsChanged', {
        by: 'Ann',
        changes: [{ setting: 'fastComputerDice', value: false }],
      });

      expect(add).toHaveBeenCalledWith(
        expect.objectContaining({ detail: 'Ann turned fast computer dice off.' }),
      );
    });

    it.each([true, false])(
      'announces bust probability %s without calling it fast dice',
      (value) => {
        const { socket, add } = setup();
        socket.fire('game:settingsChanged', {
          by: 'Ann',
          changes: [{ setting: 'showBustProbability', value }],
        });
        expect(add).toHaveBeenCalledWith(
          expect.objectContaining({
            detail: `Ann turned bust probability ${value ? 'on' : 'off'}.`,
          }),
        );
      },
    );

    it('uses the current language', () => {
      const { socket, add } = setup();
      TestBed.inject(I18nService).set('de');
      socket.fire('game:settingsChanged', {
        by: 'Ann',
        changes: [{ setting: 'computerSpeed', value: 5 }],
      });
      expect(add).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: 'Ann hat die Computer-Geschwindigkeit auf 5 (Sehr schnell) gestellt.',
        }),
      );
      TestBed.inject(I18nService).set('en');
    });

    it('shows no toast for a game:state push alone', () => {
      const { socket, add } = setup();
      socket.fire('game:state', { game: { id: 'g1', computerSpeed: 5 } });
      expect(add).not.toHaveBeenCalled();
    });
  });

  it('leave() clears the game and resolves true when the server accepts', async () => {
    const { socket, service } = setup();
    socket.replies['session:start'] = { ...started, game };
    await service.start('Ann');
    socket.replies['game:leave'] = { ok: true };
    expect(await service.leave()).toBe(true);
    expect(service.game()).toBeNull();
  });

  it('leave() keeps the game, reports an error and resolves false when rejected', async () => {
    const { socket, add, service } = setup();
    socket.replies['session:start'] = { ...started, game };
    await service.start('Ann');
    socket.replies['game:leave'] = { ok: false, reason: 'notInGame' };
    expect(await service.leave()).toBe(false);
    expect(service.game()).not.toBeNull();
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
  });

  it('keeps the session empty on an error ack', async () => {
    const { socket, service } = setup();
    socket.replies['session:start'] = { ok: false, reason: 'nicknameTaken' };
    expect((await service.start('Ann')).ok).toBe(false);
    expect(service.session()).toBeNull();
  });

  describe('UI language', () => {
    const languages = (socket: FakeSocket) =>
      socket.sent.filter((s) => s.event === 'session:language').map((s) => s.payload);

    it('is sent on the initial start', async () => {
      const { socket, service } = setup();
      socket.replies['session:start'] = started;
      await service.start('Ann');
      expect(socket.sent[0]).toMatchObject({
        event: 'session:start',
        payload: { language: TestBed.inject(I18nService).lang() },
      });
    });

    it('is sent again when the session is replayed after a reconnect', async () => {
      const { socket, service } = setup();
      socket.replies['session:start'] = { ...started, game };
      await service.start('Ann');
      TestBed.inject(I18nService).set('de');
      socket.sent.length = 0;
      socket.fire('connect');
      expect(socket.sent[0]).toMatchObject({
        event: 'session:start',
        payload: { token: 't1', language: 'de' },
      });
    });

    it('is sent on every switch after the start, but not before it', async () => {
      const { socket, service } = setup();
      const i18n = TestBed.inject(I18nService);
      i18n.set('en');
      TestBed.tick();
      i18n.set('de');
      TestBed.tick();
      expect(languages(socket)).toEqual([]);
      socket.replies['session:start'] = started;
      await service.start('Ann');
      i18n.set('en');
      TestBed.tick();
      i18n.set('de');
      TestBed.tick();
      expect(languages(socket)).toEqual([{ language: 'en' }, { language: 'de' }]);
    });

    it('is not sent while disconnected', async () => {
      const { socket, service } = setup();
      socket.replies['session:start'] = started;
      await service.start('Ann');
      socket.connected = false;
      TestBed.inject(I18nService).set(TestBed.inject(I18nService).lang() === 'en' ? 'de' : 'en');
      TestBed.tick();
      expect(languages(socket)).toEqual([]);
    });
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
      life: TOAST_MS,
    });
    socket.fire('game:closed', { reason: 'banned' });
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'warn', detail: expect.stringContaining('removed you') }),
    );
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
