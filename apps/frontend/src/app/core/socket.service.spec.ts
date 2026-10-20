import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { vi } from 'vitest';
import { I18nService } from './i18n.service';
import {
  CONNECTION_KEY,
  FAIL_AFTER_MS,
  LOST_DELAY_MS,
  RESTORED_MS,
  SOCKET,
  STORAGE_KEY,
  SocketService,
  TOAST_MS,
  type SocketLike,
} from './socket.service';

class FakeSocket implements SocketLike {
  connected = true;
  handlers = new Map<string, (...a: never[]) => void>();
  sent: { event: string; payload: unknown }[] = [];
  replies: Record<string, unknown> = {};
  /** Events whose ack is held back until `release` is called. */
  hold = new Set<string>();
  private held: { event: string; ack: (r: unknown) => void }[] = [];
  on(event: string, l: (...a: never[]) => void) {
    this.handlers.set(event, l);
  }
  emit(event: string, payload: unknown, ack: (r: unknown) => void) {
    this.sent.push({ event, payload });
    if (this.hold.has(event)) this.held.push({ event, ack });
    else ack(this.replies[event] ?? { ok: true, games: [] });
  }
  release(event: string) {
    const [first] = this.held.filter((h) => h.event === event);
    this.held = this.held.filter((h) => h !== first);
    first.ack(this.replies[event]);
  }
  connect() {
    this.connected = true;
  }
  fire(event: string, arg?: unknown) {
    (this.handlers.get(event) as (a?: unknown) => void)(arg);
  }
}

const started = { ok: true, token: 't1', playerId: 'p1', nickname: 'Ann', protocolVersion: 2 };
const game = { id: 'g1', n: 0, log: [] };

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

    it('shows no toast for a game:snapshot push alone', () => {
      const { socket, add } = setup();
      socket.fire('game:snapshot', { game: { id: 'g1', computerSpeed: 5, log: [] } });
      expect(add).not.toHaveBeenCalled();
    });
  });

  it('spectate() sends the intent and shows the spectator view on success', async () => {
    const { socket, service } = setup();
    await service.start('Ann');
    socket.replies['game:spectate'] = { ok: true, game: { id: 'g1', spectators: 1, log: [] } };
    expect(await service.spectate({ gameId: 'g1', password: '' })).toMatchObject({ ok: true });
    expect(socket.sent.at(-1)).toEqual({
      event: 'game:spectate',
      payload: { gameId: 'g1', password: '' },
    });
    expect(service.game()).toMatchObject({ id: 'g1' });
  });

  it('spectate() keeps no game when the server refuses', async () => {
    const { socket, service } = setup();
    await service.start('Ann');
    socket.replies['game:spectate'] = { ok: false, reason: 'notSpectatable' };
    expect(await service.spectate({ gameId: 'g1', password: '' })).toMatchObject({ ok: false });
    expect(service.game()).toBeNull();
  });

  it('tells a spectator the host turned spectating off', async () => {
    const { socket, add, service } = setup();
    socket.replies['session:start'] = { ...started, game };
    await service.start('Ann');
    socket.fire('game:closed', { reason: 'spectatingOff' });
    expect(service.game()).toBeNull();
    expect(add).toHaveBeenCalledWith({
      severity: 'info',
      detail: expect.stringContaining('turned spectators off'),
      life: TOAST_MS,
    });
  });

  it('shows no toast when a game:change only changes the spectator count', async () => {
    const { socket, add, service } = setup();
    socket.replies['session:start'] = { ...started, game: { ...game, spectators: 1 } };
    await service.start('Ann');
    add.mockClear();
    socket.fire('game:change', { n: 1, spectators: 3 });
    expect(service.game()).toMatchObject({ spectators: 3 });
    expect(add).not.toHaveBeenCalled();
  });

  it('says what the spectating switch did', () => {
    const { socket, add } = setup();
    socket.fire('game:settingsChanged', {
      by: 'Ann',
      changes: [{ setting: 'spectating', value: false }],
    });
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({ detail: 'Ann turned spectators off.' }),
    );
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

  describe('rematch', () => {
    const view = (round: number) => ({ ...game, round });

    it('rematch() sends the round of the shown game', async () => {
      const { socket, service } = setup();
      socket.replies['session:start'] = { ...started, game: view(3) };
      await service.start('Ann');
      expect(await service.rematch()).toBe(true);
      expect(socket.sent).toContainEqual({ event: 'rematch:start', payload: { round: 3 } });
    });

    it('rematch() reports a stale round and keeps the game', async () => {
      const { socket, add, service } = setup();
      socket.replies['session:start'] = { ...started, game: view(1) };
      await service.start('Ann');
      socket.replies['rematch:start'] = { ok: false, reason: 'staleRound' };
      expect(await service.rematch()).toBe(false);
      expect(service.game()).not.toBeNull();
      expect(add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
    });

    it('rematch() does nothing without a game', async () => {
      const { socket, service } = setup();
      expect(await service.rematch()).toBe(false);
      expect(await service.rejoinRematch()).toBe(false);
      expect(socket.sent).toEqual([]);
    });

    it('rejoinRematch() applies the lobby view of the ack', async () => {
      const { socket, service } = setup();
      socket.replies['session:start'] = { ...started, game: view(1) };
      await service.start('Ann');
      socket.replies['rematch:join'] = { ok: true, game: { ...game, round: 2, phase: 'lobby' } };
      expect(await service.rejoinRematch()).toBe(true);
      expect(socket.sent).toContainEqual({ event: 'rematch:join', payload: { round: 1 } });
      expect(service.game()).toMatchObject({ round: 2, phase: 'lobby' });
    });

    it('rejoinRematch() reports a rejection and keeps the finished view', async () => {
      const { socket, add, service } = setup();
      socket.replies['session:start'] = { ...started, game: view(1) };
      await service.start('Ann');
      socket.replies['rematch:join'] = { ok: false, reason: 'notRejoinable' };
      expect(await service.rejoinRematch()).toBe(false);
      expect(service.game()).toMatchObject({ round: 1 });
      expect(add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
    });
  });

  it('end() sends the game id and passes the ack on', async () => {
    const { socket, service } = setup();
    socket.replies['game:end'] = { ok: false, reason: 'notHost' };
    expect(await service.end('g9')).toEqual({ ok: false, reason: 'notHost' });
    expect(socket.sent).toContainEqual(expect.objectContaining({ event: 'game:end' }));
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
    expect(service.connection()).toBe('reconnecting');
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

  it('leaves no table and asks for a reload when the server refuses the version on reconnect', async () => {
    const { socket, add, service } = setup();
    socket.replies['session:start'] = { ...started, game };
    await service.start('Ann');
    add.mockClear();
    socket.replies['session:start'] = { ok: false, reason: 'versionMismatch' };
    socket.fire('connect');
    await vi.waitFor(() =>
      expect(add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'error', detail: expect.stringContaining('reload') }),
      ),
    );
    expect(service.game()).toBeNull();
    expect(service.session()).toBeNull();
  });

  it('drops a finished game on reconnect without a warning', async () => {
    const { socket, add, service } = setup();
    socket.replies['session:start'] = { ...started, game: { ...game, phase: 'finished' } };
    await service.start('Ann');
    add.mockClear();
    socket.replies['session:start'] = started;
    socket.fire('connect');
    await vi.waitFor(() => expect(service.game()).toBeNull());
    expect(add).not.toHaveBeenCalled();
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
    socket.fire('game:closed', { reason: 'ended' });
    expect(add).toHaveBeenCalledWith({
      severity: 'info',
      detail: 'The game was ended by its host.',
      life: TOAST_MS,
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

  it('applies game:snapshot and lobby:games pushes', () => {
    const { socket, service } = setup();
    socket.fire('game:snapshot', { game });
    socket.fire('lobby:games', { games: [{ id: 'x' }] });
    expect(service.game()).toEqual(game);
    expect(service.games()).toHaveLength(1);
  });

  describe('game:change', () => {
    const view = (n: number, over: object = {}) => ({
      id: 'g1',
      n,
      seats: [{ state: 'open' }, { state: 'open' }],
      spectators: 0,
      logBase: 0,
      log: [],
      ...over,
    });
    async function inGame(n = 50) {
      const t = setup();
      t.socket.replies['session:start'] = { ...started, game: view(n) };
      await t.service.start('Ann');
      t.add.mockClear();
      t.socket.sent.length = 0;
      return t;
    }
    const syncs = (socket: FakeSocket) => socket.sent.filter((s) => s.event === 'game:sync');

    it('applies the next change to the view', async () => {
      const { socket, service } = await inGame();
      socket.fire('game:change', {
        n: 51,
        spectators: 2,
        seats: [[1, { state: 'locked' }]],
        settings: { computerSpeed: 5 },
        log: [{ at: 1, e: [{ kind: 'turn' }] }],
      });
      expect(service.game()).toMatchObject({
        n: 51,
        spectators: 2,
        computerSpeed: 5,
        seats: [{ state: 'open' }, { state: 'locked' }],
        log: [{ at: 1, kind: 'turn' }],
      });
      socket.fire('game:change', { n: 52, game: null });
      expect(service.game()).toMatchObject({ n: 52, spectators: 2 });
      expect(syncs(socket)).toEqual([]);
    });

    it('ignores a change that is already in the view', async () => {
      const { socket, service } = await inGame();
      socket.fire('game:change', { n: 51, spectators: 2 });
      socket.fire('game:change', { n: 51, spectators: 9 });
      socket.fire('game:change', { n: 49, spectators: 9 });
      expect(service.game()).toMatchObject({ n: 51, spectators: 2 });
      expect(syncs(socket)).toEqual([]);
    });

    it('asks for its own snapshot on a gap and continues from it', async () => {
      const { socket, service } = await inGame();
      socket.replies['game:sync'] = { ok: true, game: view(60, { spectators: 4 }) };
      socket.fire('game:change', { n: 60, spectators: 1 });
      expect(syncs(socket)).toEqual([{ event: 'game:sync', payload: undefined }]);
      await Promise.resolve();
      expect(service.game()).toMatchObject({ n: 60, spectators: 4 });
      socket.fire('game:change', { n: 61, spectators: 5 });
      expect(service.game()).toMatchObject({ n: 61, spectators: 5 });
      socket.fire('game:change', { n: 55, spectators: 0 });
      expect(service.game()).toMatchObject({ n: 61 });
    });

    it('sends one sync at a time and drops changes while it is pending', async () => {
      const { socket, service } = await inGame();
      socket.hold.add('game:sync');
      socket.replies['game:sync'] = { ok: true, game: view(60) };
      socket.fire('game:change', { n: 60, spectators: 1 });
      socket.fire('game:change', { n: 62, spectators: 1 });
      socket.fire('game:change', { n: 51, spectators: 7 });
      expect(syncs(socket)).toHaveLength(1);
      expect(service.game()).toMatchObject({ n: 50, spectators: 0 });
      socket.release('game:sync');
      await Promise.resolve();
      expect(service.game()).toMatchObject({ n: 60 });
      // the dropped 62 left a gap: the next change asks again
      socket.hold.delete('game:sync');
      socket.replies['game:sync'] = { ok: true, game: view(63) };
      socket.fire('game:change', { n: 64, spectators: 1 });
      expect(syncs(socket)).toHaveLength(2);
    });

    it('leaves the game cleanly when the server does not know it', async () => {
      const { socket, service, add } = await inGame();
      socket.replies['game:sync'] = { ok: false, reason: 'notInGame' };
      socket.fire('game:change', { n: 60 });
      await Promise.resolve();
      expect(service.game()).toBeNull();
      expect(add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
    });

    it('keeps the view when the sync is refused for another reason', async () => {
      const { socket, service } = await inGame();
      socket.replies['game:sync'] = { ok: false, reason: 'locked', retryAfterMs: 1000 };
      socket.fire('game:change', { n: 60 });
      await Promise.resolve();
      expect(service.game()).toMatchObject({ n: 50 });
    });

    it('ignores changes without a view and does not sync while offline', async () => {
      const { socket, service } = await inGame();
      socket.fire('game:closed', { reason: 'ended' });
      socket.fire('game:change', { n: 99 });
      expect(service.game()).toBeNull();
      expect(syncs(socket)).toEqual([]);
      socket.fire('game:snapshot', { game: view(10) });
      socket.connected = false;
      socket.fire('game:change', { n: 20 });
      expect(syncs(socket)).toEqual([]);
    });

    it('takes the numbering from every snapshot: an ack, a push and a rematch', async () => {
      const { socket, service } = await inGame();
      socket.fire('game:snapshot', { game: view(7, { round: 2 }) });
      socket.fire('game:change', { n: 8, spectators: 1 });
      expect(service.game()).toMatchObject({ n: 8, round: 2, spectators: 1 });
      socket.replies['game:join'] = { ok: true, game: view(3) };
      await service.join({ gameId: 'g1', password: '' });
      socket.fire('game:change', { n: 4, spectators: 6 });
      expect(service.game()).toMatchObject({ n: 4, spectators: 6 });
    });
  });

  it('resumes a stored identity', async () => {
    const { socket, service } = setup({ token: 'old', nickname: 'Bob' });
    socket.replies['session:start'] = { ...started, nickname: 'Bob' };
    expect(await service.resume()).toBe(true);
    expect(socket.sent[0].payload).toMatchObject({ token: 'old', nickname: 'Bob' });
  });

  describe('connection', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    const connectionToasts = (add: { mock: { calls: unknown[][] } }) =>
      add.mock.calls
        .map((c) => c[0] as { severity: string; detail: string })
        .filter((m) => (m as { key?: string }).key === CONNECTION_KEY);

    async function signedIn() {
      const ctx = setup();
      ctx.socket.replies['session:start'] = { ...started, game };
      await ctx.service.start('Ann');
      return ctx;
    }

    it('does not announce a drop that heals quickly', async () => {
      const { socket, add, service } = await signedIn();
      socket.fire('disconnect', 'transport close');
      vi.advanceTimersByTime(LOST_DELAY_MS - 1);
      socket.fire('connect');
      vi.advanceTimersByTime(FAIL_AFTER_MS);
      expect(connectionToasts(add)).toEqual([]);
      expect(service.connection()).toBe('connected');
    });

    it('announces the loss, then replaces it by the restored notice', async () => {
      const { socket, add, service } = await signedIn();
      const clear = vi.spyOn(TestBed.inject(MessageService), 'clear');
      socket.fire('disconnect', 'transport close');
      vi.advanceTimersByTime(LOST_DELAY_MS);
      expect(connectionToasts(add)).toEqual([
        expect.objectContaining({ severity: 'warn', sticky: true, detail: expect.any(String) }),
      ]);
      socket.fire('connect');
      expect(clear).toHaveBeenLastCalledWith(CONNECTION_KEY);
      expect(connectionToasts(add).at(-1)).toMatchObject({
        severity: 'success',
        life: RESTORED_MS,
      });
      expect(service.connection()).toBe('connected');
    });

    it('asks for a reload when the server stays away, and still recovers', async () => {
      const { socket, add, service } = await signedIn();
      socket.fire('disconnect', 'transport close');
      vi.advanceTimersByTime(FAIL_AFTER_MS);
      expect(service.connection()).toBe('failed');
      expect(connectionToasts(add).at(-1)).toMatchObject({
        severity: 'error',
        sticky: true,
        data: { reload: true },
      });
      socket.fire('connect');
      expect(service.connection()).toBe('connected');
      expect(connectionToasts(add).at(-1)).toMatchObject({ severity: 'success' });
    });

    it('also gives up on a first connect that never succeeds', () => {
      const { socket, add, service } = setup();
      socket.connected = false;
      const fresh = TestBed.runInInjectionContext(() => new SocketService());
      expect(fresh.connection()).toBe('connecting');
      vi.advanceTimersByTime(FAIL_AFTER_MS);
      expect(fresh.connection()).toBe('failed');
      expect(connectionToasts(add)).toHaveLength(1);
      expect(service.connection()).toBe('connected');
    });

    it('reconnects itself after the server closed the socket', async () => {
      const { socket } = await signedIn();
      const connect = vi.spyOn(socket, 'connect');
      socket.fire('disconnect', 'transport close');
      expect(connect).not.toHaveBeenCalled();
      socket.fire('disconnect', 'io server disconnect');
      expect(connect).toHaveBeenCalled();
    });

    it('refuses intents until the session is replayed, instead of queueing them', async () => {
      const { socket, service } = await signedIn();
      socket.fire('disconnect', 'transport close');
      socket.sent.length = 0;
      expect(await service.send('game:start')).toEqual({ ok: false, reason: 'offline' });
      expect(await service.leave()).toBe(false);
      expect(socket.sent).toEqual([]);

      let finish!: (r: unknown) => void;
      socket.emit = (event: string, payload: unknown, ack: (r: unknown) => void) => {
        socket.sent.push({ event, payload });
        if (event === 'session:start') finish = ack;
      };
      socket.fire('connect');
      expect(service.online()).toBe(false);
      expect(await service.send('game:start')).toEqual({ ok: false, reason: 'offline' });
      finish({ ...started, game });
      await vi.waitFor(() => expect(service.online()).toBe(true));
      expect(socket.sent.map((s) => s.event)).toEqual(['session:start', 'lobby:list']);
    });
  });
});
