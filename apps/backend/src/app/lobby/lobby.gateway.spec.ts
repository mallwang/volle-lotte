import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { defaultRules, PROTOCOL_VERSION, type Ack, type GameView } from 'game-rules';
import { io, type Socket } from 'socket.io-client';
import { LobbyModule } from './lobby.module';

let app: INestApplication;
let url: string;
const sockets: Socket[] = [];

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [LobbyModule] }).compile();
  app = mod.createNestApplication();
  await app.listen(0);
  url = await app.getUrl();
});
afterAll(async () => {
  sockets.forEach((s) => s.close());
  await app.close();
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any; // eslint-disable-line sonarjs/redundant-type-aliases

class Client {
  readonly socket: Socket;
  token = '';
  pushes: { event: string; payload: Any }[] = [];
  private constructor(socket: Socket) {
    this.socket = socket;
    sockets.push(socket);
    socket.onAny((event, payload) => this.pushes.push({ event, payload }));
  }
  static async connect(): Promise<Client> {
    const socket = io(url, { transports: ['websocket'], forceNew: true });
    await new Promise<void>((resolve) => socket.on('connect', () => resolve()));
    return new Client(socket);
  }
  static async start(nickname: string, token?: string): Promise<Client> {
    const c = await Client.connect();
    const ack = await c.send('session:start', {
      nickname,
      token,
      protocolVersion: PROTOCOL_VERSION,
    });
    c.token = ack.token;
    return c;
  }
  send(event: string, payload?: unknown): Promise<Ack<Any> & Any> {
    return this.socket.timeout(2000).emitWithAck(event, payload);
  }
  async until(event: string, pred: (p: Any) => boolean = () => true): Promise<Any> {
    for (let i = 0; i < 100; i++) {
      const hit = this.pushes.find((p) => p.event === event && pred(p.payload));
      if (hit) return hit.payload;
      await new Promise((r) => setTimeout(r, 20));
    }
    throw new Error(`no ${event}`);
  }
}

const create = (c: Client, seats = 3, password = 'secret') =>
  c.send('game:create', { name: 'Table', password, seats, rules: defaultRules() });

describe('session:start', () => {
  it('guards, validates and versions', async () => {
    const c = await Client.connect();
    expect(await c.send('lobby:list')).toMatchObject({ ok: false, reason: 'noSession' });
    expect(await c.send('session:start', { nickname: 'Ann', protocolVersion: 99 })).toMatchObject({
      reason: 'versionMismatch',
    });
    expect(
      await c.send('session:start', { nickname: '!', protocolVersion: PROTOCOL_VERSION }),
    ).toMatchObject({ reason: 'invalidNickname' });
    expect(
      await c.send('session:start', { nickname: 'Ann', protocolVersion: PROTOCOL_VERSION }),
    ).toMatchObject({ ok: true });
    expect(await c.send('game:join', { gameId: 1 })).toMatchObject({ reason: 'invalidRequest' });
  });

  it('resumes by token and replaces the older socket', async () => {
    const a = await Client.start('Resume');
    await create(a);
    const b = await Client.start('ignored', a.token);
    const ack = await b.send('session:start', {
      token: a.token,
      nickname: 'x',
      protocolVersion: PROTOCOL_VERSION,
    });
    expect(ack).toMatchObject({ ok: true, nickname: 'Resume', game: { you: { seat: 0 } } });
    await a.until('session:replaced');
    await new Promise((r) => setTimeout(r, 50));
    expect(a.socket.connected).toBe(false);
  });
});

describe('create and join', () => {
  it('checks passwords, limits attempts, fills seats and leaks no secrets', async () => {
    const host = await Client.start('Hosty');
    const created = await create(host, 2, 'topsecret');
    const game: GameView = created.game;
    expect(JSON.stringify(created)).not.toContain('topsecret');
    const list = await host.send('lobby:list');
    expect(list.games).toContainEqual(
      expect.objectContaining({ id: game.id, seatsUsed: 1, seatsTotal: 2, protected: true }),
    );

    const p = await Client.start('Pia');
    expect(await p.send('game:join', { gameId: game.id, password: 'nope1' })).toMatchObject({
      reason: 'wrongPassword',
      attemptsLeft: 4,
    });
    expect(await p.send('game:join', { gameId: 'missing', password: 'nope1' })).toMatchObject({
      reason: 'gameNotFound',
    });
    expect(await p.send('game:join', { gameId: game.id, password: 'topsecret' })).toMatchObject({
      ok: true,
    });
    const view = await host.until('game:state', (s) => s.game.seats[1].state === 'human');
    expect(JSON.stringify(view)).not.toMatch(/topsecret|token|passwordHash/);

    const q = await Client.start('pia');
    expect(await q.send('game:join', { gameId: game.id, password: 'topsecret' })).toMatchObject({
      reason: 'nicknameTaken',
    });
    const r = await Client.start('Rob');
    expect(await r.send('game:join', { gameId: game.id, password: 'topsecret' })).toMatchObject({
      reason: 'gameFull',
    });

    const x = await Client.start('Xavier');
    for (let left = 4; left >= 0; left--) {
      expect(await x.send('game:join', { gameId: game.id, password: 'wrong!' })).toMatchObject({
        reason: 'wrongPassword',
        attemptsLeft: left,
      });
    }
    expect(await x.send('game:join', { gameId: game.id, password: 'topsecret' })).toMatchObject({
      reason: 'locked',
    });
  });
});

describe('open games', () => {
  it('joins without a password, rejects 1-3 char passwords', async () => {
    const host = await Client.start('Hosty');
    expect(await create(host, 2, 'abc')).toMatchObject({ reason: 'invalidPassword' });
    const { game } = await create(host, 2, '');
    expect((await host.send('lobby:list')).games).toContainEqual(
      expect.objectContaining({ id: game.id, protected: false }),
    );
    const p = await Client.start('Pia');
    expect(await p.send('game:join', { gameId: game.id })).toMatchObject({ ok: true });
  });
});

describe('game lobby and play', () => {
  it('seats, readiness, start, turn guards and leaving', async () => {
    const host = await Client.start('Lobbyhost');
    const { game } = await create(host, 4);
    const p = await Client.start('Lobbyguest');
    await p.send('game:join', { gameId: game.id, password: 'secret' });

    expect(await p.send('seat:set', { seat: 3, mode: 'locked' })).toMatchObject({
      reason: 'notHost',
    });
    expect(await host.send('seat:set', { seat: 1, mode: 'locked' })).toMatchObject({
      reason: 'seatOccupied',
    });
    expect(
      await host.send('seat:set', { seat: 2, mode: 'computer', difficulty: 'hard' }),
    ).toMatchObject({ ok: true });
    expect(await host.send('seat:set', { seat: 3, mode: 'locked' })).toMatchObject({ ok: true });
    expect(await host.send('game:start')).toMatchObject({ reason: 'notReady' });
    await host.send('seat:ready', { ready: true });
    await p.send('seat:ready', { ready: true });
    expect(await p.send('game:start')).toMatchObject({ reason: 'notHost' });
    expect(await host.send('game:start')).toEqual({ ok: true });

    const state = await p.until('game:state', (s) => s.game.phase === 'running');
    expect(state.game.game.deck).toBeUndefined();
    const current = state.game.game.current;
    const humans = [host, p];
    const seatPlayers = state.game.seats.filter(
      (s: Any) => s.state !== 'open' && s.state !== 'locked',
    );
    const mover = seatPlayers[current]?.playerId === state.game.you.playerId ? p : host;
    const waiter = mover === p ? host : p;
    if (seatPlayers[current]?.state === 'human') {
      const before = waiter.pushes.length;
      expect(await waiter.send('turn:action', { action: { type: 'draw' } })).toMatchObject({
        reason: 'notYourTurn',
      });
      expect(await mover.send('turn:action', { action: { type: 'bank' } })).toMatchObject({
        ok: false,
      });
      await new Promise((r) => setTimeout(r, 50));
      expect(waiter.pushes).toHaveLength(before);
    }
    expect(humans).toHaveLength(2);

    expect(await p.send('game:leave')).toMatchObject({ ok: true });
    expect(await p.send('game:start')).toMatchObject({ reason: 'notInGame' });
    // the leaver's seat is now a computer that remembers who it replaced
    const after = await host.until('game:state', (s) =>
      s.game.seats.some((x: Any) => x.former?.nickname === 'Lobbyguest'),
    );
    expect(after.game.seats.filter((x: Any) => x.state === 'human')).toHaveLength(1);
  });
});

describe('game settings', () => {
  it('is host only, validated, and pushed to everyone', async () => {
    const host = await Client.start('Settingshost');
    const { game } = await create(host, 2);
    const p = await Client.start('Settingsguest');
    await p.send('game:join', { gameId: game.id, password: 'secret' });
    expect(await p.send('game:settings', { fastComputerDice: true })).toMatchObject({
      reason: 'notHost',
    });
    expect(await host.send('game:settings', { fastComputerDice: 'yes' })).toMatchObject({
      reason: 'invalidRequest',
    });
    expect(await host.send('game:settings', { fastComputerDice: true })).toEqual({ ok: true });
    const state = await p.until('game:state', (s) => s.game.fastComputerDice === true);
    expect(state.game.fastComputerDice).toBe(true);
  });
});

describe('seat:remove', () => {
  it('is host only, locks and bans the player, who cannot rejoin', async () => {
    const host = await Client.start('Banhost');
    const { game } = await create(host, 4);
    const p = await Client.start('Banguest');
    await p.send('game:join', { gameId: game.id, password: 'secret' });

    expect(await p.send('seat:remove', { seat: 0 })).toMatchObject({ reason: 'notHost' });
    expect(await host.send('seat:remove', { seat: 0 })).toMatchObject({ reason: 'seatNotFree' });
    expect(await host.send('seat:remove', { seat: 9 })).toMatchObject({ reason: 'invalidRequest' });
    expect(await host.send('seat:remove', { seat: 1 })).toMatchObject({ ok: true });
    expect(await p.until('game:closed')).toEqual({ reason: 'banned' });
    expect(await p.send('game:join', { gameId: game.id, password: 'secret' })).toMatchObject({
      reason: 'banned',
    });
    const state = await host.until('game:state', (s) => s.game.seats[1].state === 'locked');
    expect(state.game.seats[1]).toEqual({ state: 'locked' });
  });

  it('does not ban a player who leaves voluntarily', async () => {
    const host = await Client.start('Leavehost');
    const { game } = await create(host, 3);
    const p = await Client.start('Leaveguest');
    await p.send('game:join', { gameId: game.id, password: 'secret' });
    await p.send('game:leave');
    expect(await p.send('game:join', { gameId: game.id, password: 'secret' })).toMatchObject({
      ok: true,
    });
  });
});

describe('game:rejoin', () => {
  it('returns a leaver to their seat and flags the game as rejoinable in the lobby', async () => {
    const host = await Client.start('Rejhost');
    const { game } = await create(host, 2);
    const p = await Client.start('Rejguest');
    await p.send('game:join', { gameId: game.id, password: 'secret' });
    await host.send('seat:ready', { ready: true });
    await p.send('seat:ready', { ready: true });
    await host.send('game:start');
    await p.send('game:leave');

    const list = await p.send('lobby:list');
    expect(list.games.find((g: Any) => g.id === game.id)).toMatchObject({ rejoinable: true });
    expect(await p.send('game:rejoin', { gameId: 'nope' })).toMatchObject({
      reason: 'gameNotFound',
    });
    const res = await p.send('game:rejoin', { gameId: game.id });
    expect(res).toMatchObject({ ok: true, game: { id: game.id } });
    expect(await p.send('game:rejoin', { gameId: game.id })).toMatchObject({
      reason: 'alreadyInGame',
    });
  });
});
