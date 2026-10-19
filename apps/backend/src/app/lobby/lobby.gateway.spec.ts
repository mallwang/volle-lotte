import { PROTOCOL_VERSION, type GameView } from 'game-rules';
import { Client, create, startApp, stopApp, type Any } from './testing/client';

beforeAll(startApp);
afterAll(stopApp);

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
    expect(
      await host.send('seat:set', { seat: 2, mode: 'computer', difficulty: 'easy', risk: 'wild' }),
    ).toMatchObject({ reason: 'invalidRequest' });
    expect(
      await host.send('seat:set', { seat: 2, mode: 'computer', difficulty: 'hard', risk: 'high' }),
    ).toMatchObject({ ok: true });
    expect(await host.until('game:state', (s) => s.game.seats[2].risk === 'high')).toBeTruthy();
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

/** Counts `game:settingsChanged` pushes a client receives from now on. */
const noPush = (c: Client) => {
  let n = 0;
  c.socket.on('game:settingsChanged', () => n++);
  return () => n;
};

describe('game settings', () => {
  it('is host only, validated, and pushed to everyone', async () => {
    const host = await Client.start('Settingshost');
    const { game } = await create(host, 2);
    const p = await Client.start('Settingsguest');
    await p.send('game:join', { gameId: game.id, password: 'secret' });
    expect(await p.send('game:settings', { fastComputerDice: true })).toMatchObject({
      reason: 'notHost',
    });
    expect(await p.send('game:settings', { computerSpeed: 4 })).toMatchObject({
      reason: 'notHost',
    });
    expect(await p.send('game:settings', { showBustProbability: true })).toMatchObject({
      reason: 'notHost',
    });
    for (const body of [
      {},
      { fastComputerDice: 'yes' },
      { computerSpeed: 0 },
      { computerSpeed: 6 },
      { computerSpeed: '3' },
      { computerSpeed: 2.5 },
      { showBustProbability: 'true' },
      { showBustProbability: 1 },
      { showBustProbability: null },
    ])
      expect(await host.send('game:settings', body)).toMatchObject({ reason: 'invalidRequest' });
    expect(await host.send('game:settings', { fastComputerDice: true })).toEqual({ ok: true });
    const state = await p.until('game:state', (s) => s.game.fastComputerDice === true);
    expect(state.game.fastComputerDice).toBe(true);
    expect(state.game.computerSpeed).toBe(3);
    expect(state.game.showBustProbability).toBe(false);
    const seen = p.until(
      'game:settingsChanged',
      (s) => s.changes[0]?.setting === 'showBustProbability',
    );
    expect(await host.send('game:settings', { showBustProbability: true })).toEqual({ ok: true });
    expect(await seen).toEqual({
      by: 'Settingshost',
      changes: [{ setting: 'showBustProbability', value: true }],
    });
    const odds = await p.until('game:state', (s) => s.game.showBustProbability === true);
    expect(odds.game.showBustProbability).toBe(true);
  });

  it('pushes one game:settingsChanged per accepted change, to host and guest', async () => {
    const host = await Client.start('Pushhost');
    const { game } = await create(host, 2);
    const p = await Client.start('Pushguest');
    await p.send('game:join', { gameId: game.id, password: 'secret' });
    const expected = { by: 'Pushhost', changes: [{ setting: 'computerSpeed', value: 5 }] };
    const seenByGuest = p.until('game:settingsChanged');
    const seenByHost = host.until('game:settingsChanged');
    expect(await host.send('game:settings', { computerSpeed: 5 })).toEqual({ ok: true });
    expect(await seenByGuest).toEqual(expected);
    expect(await seenByHost).toEqual(expected);
    const view = await p.until('game:state', (s) => s.game.computerSpeed === 5);
    expect(view.game.computerSpeed).toBe(5);
    // a no-op change sends no push; a late joiner gets none either
    const quiet = noPush(p);
    expect(await host.send('game:settings', { computerSpeed: 5 })).toEqual({ ok: true });
    const late = await Client.start('Pushlate');
    const late2 = noPush(late);
    await new Promise((r) => setTimeout(r, 100));
    expect(quiet()).toBe(0);
    expect(late2()).toBe(0);
  });
});

describe('seat:remove', () => {
  it('is host only, bans the player and frees the seat, who cannot rejoin', async () => {
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
    const state = await host.until('game:state', (s) => s.game.seats[1].state === 'open');
    expect(state.game.seats[1]).toEqual({ state: 'open' });
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
