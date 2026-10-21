import { TestBed } from '@angular/core/testing';
import { PROTOCOL_VERSION, encodeView } from 'game-rules';
import { MobileSocketService, STORAGE_KEY } from './mobile-socket.service';
import { fakeSocket, gameView } from './testing';

const started = { ok: true, token: 't1', playerId: 'p0', nickname: 'Anna' } as const;

describe('MobileSocketService', () => {
  beforeEach(() => localStorage.clear());

  it('exposes the shared protocol version and tracks the connection', () => {
    const { fire, socket } = fakeSocket({}, false);
    const service = TestBed.inject(MobileSocketService);
    expect(service.protocolVersion).toBe(PROTOCOL_VERSION);
    expect(service.online()).toBe(false);
    fire('connect');
    expect(service.online()).toBe(true);
    fire('disconnect', 'transport close');
    expect(service.online()).toBe(false);
    socket.connected = false;
    fire('disconnect', 'io server disconnect');
    expect(socket.connected).toBe(true);
  });

  it('starts a session, stores the identity and loads the list', async () => {
    fakeSocket({ 'session:start': started, 'lobby:list': { ok: true, games: [{ id: 'g' }] } });
    const service = TestBed.inject(MobileSocketService);
    expect((await service.start('Anna')).ok).toBe(true);
    expect(service.session()).toEqual({ playerId: 'p0', nickname: 'Anna' });
    expect(service.games()).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')).toEqual({
      token: 't1',
      nickname: 'Anna',
    });
  });

  it('resumes a stored identity and fails without one', async () => {
    fakeSocket({ 'session:start': started });
    expect(await TestBed.inject(MobileSocketService).resume()).toBe(false);
    TestBed.resetTestingModule();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: 't1', nickname: 'Anna' }));
    fakeSocket({ 'session:start': started });
    const service = TestBed.inject(MobileSocketService);
    expect(service.storedNickname).toBe('Anna');
    expect(await service.resume()).toBe(true);
  });

  it('replays the session on reconnect and drops it when refused', async () => {
    const { fire, emit } = fakeSocket({ 'session:start': started });
    const service = TestBed.inject(MobileSocketService);
    await service.start('Anna');
    fire('disconnect', 'transport close');
    fire('connect');
    expect(emit.mock.calls.filter((c) => c[0] === 'session:start')).toHaveLength(2);
    await vi.waitFor(() => expect(service.online()).toBe(true));
  });

  it('applies lobby and game pushes, resyncs on a gap', async () => {
    const view = gameView({ n: 1 });
    const { fire, emit } = fakeSocket({
      'session:start': { ...started, game: encodeView(view) },
      'game:sync': { ok: true, game: encodeView(gameView({ n: 5 })) },
    });
    const service = TestBed.inject(MobileSocketService);
    await service.start('Anna');
    fire('lobby:games', { games: [{ id: 'a' }, { id: 'b' }] });
    expect(service.games()).toHaveLength(2);
    fire('game:change', { n: 2, hostId: 'p9' });
    expect(service.game()?.hostId).toBe('p9');
    fire('game:change', { n: 2, hostId: 'p1' }); // already applied
    expect(service.game()?.hostId).toBe('p9');
    fire('game:change', { n: 5 });
    await vi.waitFor(() => expect(service.game()?.n).toBe(5));
    expect(emit).toHaveBeenCalledWith('game:sync', undefined, expect.any(Function));
    fire('game:snapshot', { game: encodeView(gameView({ n: 9 })) });
    expect(service.game()?.n).toBe(9);
  });

  it('clears the game on game:closed and the session when replaced', async () => {
    const { fire } = fakeSocket({ 'session:start': { ...started, game: encodeView(gameView()) } });
    const service = TestBed.inject(MobileSocketService);
    await service.start('Anna');
    fire('game:closed', { reason: 'banned' });
    expect(service.game()).toBeNull();
    expect(service.notice()).toBe('server.banned');
    fire('game:closed', { reason: 'cleanup' });
    expect(service.notice()).toBe('server.closed');
    fire('session:replaced');
    expect(service.session()).toBeNull();
    expect(service.notice()).toBe('server.replaced');
  });

  it('refuses intents while offline', async () => {
    const { emit } = fakeSocket({}, false);
    const ack = await TestBed.inject(MobileSocketService).send('lobby:list');
    expect(ack).toEqual({ ok: false, reason: 'offline' });
    expect(emit).not.toHaveBeenCalled();
  });

  it('adopts the game of create and join and clears it on leave', async () => {
    const wire = encodeView(gameView());
    fakeSocket({
      'game:create': { ok: true, game: wire },
      'game:join': { ok: true, game: wire },
      'lobby:list': { ok: true, games: [] },
    });
    const service = TestBed.inject(MobileSocketService);
    await service.create({} as never);
    expect(service.game()?.id).toBe('g1');
    await service.leave();
    expect(service.game()).toBeNull();
    await service.join({} as never);
    expect(service.game()?.id).toBe('g1');
  });
});
