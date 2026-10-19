import { PROTOCOL_VERSION } from 'game-rules';
import { Client, create, registry, startApp, stopApp, type Any } from './testing/client';

beforeAll(startApp);
afterAll(stopApp);

/** A running two-player game; its host and guest. */
async function runningGame(name: string, password = '') {
  const host = await Client.start(`${name}host`);
  const { game } = await create(host, 2, password);
  const guest = await Client.start(`${name}guest`);
  await guest.send('game:join', { gameId: game.id, password });
  await host.send('seat:ready', { ready: true });
  await guest.send('seat:ready', { ready: true });
  expect(await host.send('game:start')).toEqual({ ok: true });
  await guest.until('game:state', (s) => s.game.phase === 'running');
  return { host, guest, id: game.id as string };
}

const quiet = (c: Client, event: string) => {
  let n = 0;
  c.socket.on(event, () => n++);
  return () => n;
};

const tick = () => new Promise((r) => setTimeout(r, 80));

describe('game:spectate', () => {
  it('refuses unknown, unstarted, banned and busy visitors', async () => {
    const anon = await Client.connect();
    expect(await anon.send('game:spectate', { gameId: 'x' })).toMatchObject({
      reason: 'noSession',
    });
    const host = await Client.start('Spechost');
    const { game } = await create(host, 2, '');
    const v = await Client.start('Specvisitor');
    expect(await v.send('game:spectate', { gameId: 1 })).toMatchObject({
      reason: 'invalidRequest',
    });
    expect(await v.send('game:spectate', { gameId: 'nope' })).toMatchObject({
      reason: 'gameNotFound',
    });
    expect(await v.send('game:spectate', { gameId: game.id, password: '' })).toMatchObject({
      reason: 'notSpectatable',
    });
    expect(await host.send('game:spectate', { gameId: game.id, password: '' })).toMatchObject({
      reason: 'alreadyInGame',
    });
    expect((await host.send('lobby:list')).games[0].spectatable).toBe(false);
  });

  it('shows a read-only view, counts silently and refuses every play intent', async () => {
    const { host, guest, id } = await runningGame('Watch');
    const flag = (await host.send('lobby:list')).games.find((g: Any) => g.id === id);
    expect(flag.spectatable).toBe(true);
    const logs = quiet(host, 'game:log');
    const toasts = quiet(host, 'game:settingsChanged');

    const spec = await Client.start('Watcher');
    const ack = await spec.send('game:spectate', { gameId: id, password: '' });
    expect(ack).toMatchObject({
      ok: true,
      game: { you: { seat: -1, spectator: true }, spectators: 1, spectating: true },
    });
    expect(JSON.stringify(ack)).not.toMatch(/"deck"|token|passwordHash/);
    expect(await spec.send('game:spectate', { gameId: id })).toMatchObject({
      reason: 'alreadyInGame',
    });
    expect(await spec.send('game:create', {})).toMatchObject({ reason: 'alreadyInGame' });
    await host.until('game:state', (s) => s.game.spectators === 1);
    await guest.until('game:state', (s) => s.game.spectators === 1);

    for (const [event, body] of [
      ['turn:action', { action: { type: 'draw' } }],
      ['turn:preview', { dice: [] }],
      ['seat:ready', { ready: true }],
      ['game:start', undefined],
      ['game:pause', { paused: true }],
      ['game:settings', { computerSpeed: 2 }],
      ['rematch:start', { round: 1 }],
      ['rematch:join', { round: 1 }],
    ] as const) {
      expect(await spec.send(event, body)).toMatchObject({ ok: false, reason: 'notInGame' });
    }

    expect(await spec.send('game:leave')).toEqual({ ok: true });
    await host.until('game:state', (s) => s.game.spectators === 0);
    await spec.until('lobby:games');
    expect(await spec.send('game:leave')).toMatchObject({ reason: 'notInGame' });
    await tick();
    expect(logs()).toBe(0);
    expect(toasts()).toBe(0);
  });

  it('gets the state pushes of the game, never log entries, and may be the ninth viewer', async () => {
    const { host, id } = await runningGame('Flow');
    const spec = await Client.start('Flowspec');
    await spec.send('game:spectate', { gameId: id });
    registry()
      .get(id)
      ?.setPaused(registry().get(id)?.hostId ?? '', true);
    const paused = await spec.until('game:state', (s) => s.game.paused === true);
    expect(paused.game.you.spectator).toBe(true);
    expect(spec.pushes.some((p) => p.event === 'game:log')).toBe(false);
    for (let i = 0; i < 8; i++) {
      const more = await Client.start(`Flowmore${i}`);
      expect(await more.send('game:spectate', { gameId: id })).toMatchObject({ ok: true });
    }
    await host.until('game:state', (s) => s.game.spectators === 9);
  });

  it('checks the password and shares the attempt limit with join', async () => {
    const { id } = await runningGame('Pw', 'topsecret');
    const v = await Client.start('Pwvisitor');
    expect(await v.send('game:spectate', { gameId: id })).toMatchObject({
      reason: 'invalidPassword',
    });
    expect(await v.send('game:spectate', { gameId: id, password: 'wrong!' })).toMatchObject({
      reason: 'wrongPassword',
      attemptsLeft: 4,
    });
    expect(await v.send('game:spectate', { gameId: id, password: 'topsecret' })).toMatchObject({
      ok: true,
    });
  });

  it('refuses banned players', async () => {
    const host = await Client.start('Banspechost');
    const { game } = await create(host, 3, '');
    const p = await Client.start('Banspecguest');
    await p.send('game:join', { gameId: game.id });
    await host.send('seat:remove', { seat: 1 });
    await p.until('game:closed');
    expect(await p.send('game:spectate', { gameId: game.id })).toMatchObject({ reason: 'banned' });
  });
});

describe('host switch', () => {
  it('is host only, sends spectators back and hides Watch', async () => {
    const { host, guest, id } = await runningGame('Switch');
    const spec = await Client.start('Switchspec');
    await spec.send('game:spectate', { gameId: id });
    expect(await guest.send('game:settings', { spectating: false })).toMatchObject({
      reason: 'notHost',
    });
    expect(await host.send('game:settings', { spectating: 'no' })).toMatchObject({
      reason: 'invalidRequest',
    });
    const seen = guest.until('game:settingsChanged');
    expect(await host.send('game:settings', { spectating: false })).toEqual({ ok: true });
    expect(await spec.until('game:closed')).toEqual({ reason: 'spectatingOff' });
    expect(await seen).toEqual({
      by: 'Switchhost',
      changes: [{ setting: 'spectating', value: false }],
    });
    expect(spec.pushes.some((p) => p.event === 'game:settingsChanged')).toBe(false);
    expect((await spec.send('lobby:list')).games.find((g: Any) => g.id === id).spectatable).toBe(
      false,
    );
    expect(await spec.send('game:spectate', { gameId: id })).toMatchObject({
      reason: 'notSpectatable',
    });
    await host.send('game:settings', { spectating: true });
    const again = await spec.send('game:spectate', { gameId: id });
    expect(again).toMatchObject({ ok: true, game: { spectators: 1 } });
  });
});

describe('reload', () => {
  it('resumes watching, also a finished game, but not after the switch is off', async () => {
    const { host, id } = await runningGame('Reload');
    const spec = await Client.start('Reloadspec');
    await spec.send('game:spectate', { gameId: id });
    await host.until('game:state', (s) => s.game.spectators === 1);
    spec.socket.close();
    await host.until('game:state', (s) => s.game.spectators === 0);

    const back = await Client.connect();
    const ack = await back.send('session:start', {
      token: spec.token,
      nickname: 'x',
      protocolVersion: PROTOCOL_VERSION,
    });
    expect(ack).toMatchObject({ ok: true, game: { you: { spectator: true }, spectators: 1 } });
    await host.until('game:state', (s) => s.game.spectators === 1);

    registry().get(id)!.phase = 'finished';
    back.socket.close();
    const finished = await Client.connect();
    expect(
      await finished.send('session:start', {
        token: spec.token,
        nickname: 'x',
        protocolVersion: PROTOCOL_VERSION,
      }),
    ).toMatchObject({ ok: true, game: { phase: 'finished', you: { spectator: true } } });
    // a new visitor may not watch a finished game
    const late = await Client.start('Reloadlate');
    expect(await late.send('game:spectate', { gameId: id })).toMatchObject({
      reason: 'notSpectatable',
    });

    registry().get(id)!.spectating = false;
    finished.socket.close();
    const off = await Client.connect();
    const offAck = await off.send('session:start', {
      token: spec.token,
      nickname: 'x',
      protocolVersion: PROTOCOL_VERSION,
    });
    expect(offAck.game).toBeUndefined();
    expect(
      await off.send('game:create', { name: 'T', password: '', seats: 2, rules: {} }),
    ).not.toMatchObject({
      reason: 'alreadyInGame',
    });
  });

  it('does not resume into a removed room', async () => {
    const { id } = await runningGame('Gone');
    const spec = await Client.start('Gonespec');
    await spec.send('game:spectate', { gameId: id });
    spec.socket.close();
    registry().remove(id);
    const back = await Client.connect();
    const ack = await back.send('session:start', {
      token: spec.token,
      nickname: 'x',
      protocolVersion: PROTOCOL_VERSION,
    });
    expect(ack).toMatchObject({ ok: true });
    expect(ack.game).toBeUndefined();
  });
});

describe('room end', () => {
  it('sends spectators back when a rematch starts', async () => {
    const { host, id } = await runningGame('End');
    const spec = await Client.start('Endspec');
    await spec.send('game:spectate', { gameId: id });
    registry().get(id)!.phase = 'finished';
    expect(await host.send('rematch:start', { round: 1 })).toEqual({ ok: true });
    expect(await spec.until('game:closed')).toEqual({ reason: 'ended' });
    expect(registry().get(id)!.spectators.size).toBe(0);
    expect(await spec.send('game:leave')).toMatchObject({ reason: 'notInGame' });
  });

  it('sends spectators back when the room is cleaned up', async () => {
    const { id } = await runningGame('Clean');
    const spec = await Client.start('Cleanspec');
    await spec.send('game:spectate', { gameId: id });
    const reg = registry();
    const room = reg.get(id)!;
    reg.remove(id);
    reg.onClosed?.(room, 'cleanup');
    expect(await spec.until('game:closed')).toEqual({ reason: 'cleanup' });
  });
});
