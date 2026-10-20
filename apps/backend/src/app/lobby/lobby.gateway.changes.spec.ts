import { decodeLog, LOG_CAP, PROTOCOL_VERSION, scriptedRandomInt } from 'game-rules';
import { Client, create, registry, startApp, stopApp, type Any } from './testing/client';

beforeAll(startApp);
afterAll(stopApp);

const tick = () => new Promise((r) => setTimeout(r, 80));
const changes = (c: Client, from = 0): Any[] =>
  c.pushes
    .slice(from)
    .filter((p) => p.event === 'game:change')
    .map((p) => p.payload);
const MOVE = { draw: 'draw', throw: 'throw', decide: 'bank', select: 'throw' } as const;
const size = (payload: unknown) => JSON.stringify(['game:change', payload]).length;

/** A running two-player game with a spectator; ids and the room for server-side actions. */
async function table(name: string, spectator = true) {
  const host = await Client.start(`${name}host`);
  const created = await create(host, 2, '');
  const id: string = created.game.id;
  const guest = await Client.start(`${name}guest`);
  await guest.send('game:join', { gameId: id, password: '' });
  await host.send('seat:ready', { ready: true });
  await guest.send('seat:ready', { ready: true });
  expect(await host.send('game:start')).toEqual({ ok: true });
  const room = registry().get(id)!;
  const hostId: string = created.game.you.playerId;
  const guestId = guest.view!.you.playerId;
  // the same cards and dice in every run: a Bonus card, and a throw that has a 1 to set aside
  room.game = { ...room.game!, deck: Array.from({ length: 30 }, () => 'bonus200' as const) };
  Object.assign(room, {
    rng: scriptedRandomInt(Array.from({ length: 60 }, (_, i) => [0, 1, 1, 2, 3, 5][i % 6])),
  });
  // the clients learn about the new deck through two ordinary changes
  room.setPaused(hostId, true);
  room.setPaused(hostId, false);
  await tick();
  let spec: Client | undefined;
  if (spectator) {
    spec = await Client.start(`${name}spec`);
    expect(await spec.send('game:spectate', { gameId: id, password: '' })).toMatchObject({
      ok: true,
    });
  }
  const mover = () => (room.game?.current === 0 ? hostId : guestId);
  const all = [host, guest, ...(spec ? [spec] : [])];
  return { host, guest, spec, id, room, hostId, guestId, mover, all };
}

describe('game:change', () => {
  it('carries the new log entries and only the parts that changed, to everybody', async () => {
    const t = await table('Chg');
    const from = t.all.map((c) => c.pushes.length);
    expect(t.room.act(t.mover(), { type: 'draw' })).toMatchObject({ ok: true });
    await tick();
    for (const [i, c] of t.all.entries()) {
      const [change] = changes(c, from[i]);
      expect(change).toBeDefined();
      expect(change.game).toBeUndefined();
      expect(change.gameDiff).toBeDefined();
      for (const absent of ['seats', 'rules', 'name', 'hostId', 'id']) {
        expect(change).not.toHaveProperty(absent);
      }
      const sent = decodeLog(change.log);
      expect(sent).toEqual(t.room.log.slice(-sent.length));
    }
    const views = t.all.map((c) => c.view!);
    expect(views[2].game).toEqual(views[0].game);
    expect(views[2].log).toEqual(views[0].log);
  });

  it('sends a card draw as a game difference without names or scores', async () => {
    const t = await table('Diff');
    const from = t.all.map((c) => c.pushes.length);
    t.room.act(t.mover(), { type: 'draw' });
    await tick();
    for (const [i, c] of t.all.entries()) {
      const [change] = changes(c, from[i]);
      expect(Object.keys(change.gameDiff).sort()).toEqual(['deckSize', 'turn']);
      expect(change.gameDiff.turn).toMatchObject({ phase: 'throw', card: 'bonus200' });
    }
  });

  it('names only the banking player in a bank, and the new current player', async () => {
    const t = await table('Bank');
    t.room.game = { ...t.room.game!, rules: { ...t.room.game!.rules, minimumPoints: 0 } };
    const banker = t.room.game!.current;
    for (const action of [
      { type: 'draw' },
      { type: 'throw' },
      { type: 'select', dice: [0] },
    ] as const)
      expect(t.room.act(t.mover(), action)).toMatchObject({ ok: true });
    await tick();
    const from = t.all.map((c) => c.pushes.length);
    expect(t.room.act(t.mover(), { type: 'bank' })).toMatchObject({ ok: true });
    await tick();
    for (const [i, c] of t.all.entries()) {
      const [change] = changes(c, from[i]);
      expect(change.gameDiff.players).toEqual([[banker, { score: expect.any(Number) }]]);
      expect(change.gameDiff.current).toBe(1 - banker);
      expect(change).not.toHaveProperty('game');
    }
  });

  it('sends the result with the difference when the game ends', async () => {
    const t = await table('End');
    t.room.game = {
      ...t.room.game!,
      rules: { ...t.room.game!.rules, minimumPoints: 0, targetScore: 100 },
    };
    const from = t.all.map((c) => c.pushes.length);
    for (const action of [
      { type: 'draw' },
      { type: 'throw' },
      { type: 'select', dice: [0] },
      { type: 'bank' },
    ] as const)
      expect(t.room.act(t.mover(), action)).toMatchObject({ ok: true });
    await tick();
    for (const [i, c] of t.all.entries()) {
      const sent = changes(c, from[i]);
      expect(sent.some((ch) => ch.gameDiff?.result?.reason === 'targetScore')).toBe(true);
    }
  });

  it('gives a spectator the same game differences as a player, and a whole played game adds up', async () => {
    const t = await table('Same');
    const from = t.all.map((c) => c.pushes.length);
    for (let i = 0; i < 40 && t.room.game?.result === null; i++) {
      const phase = t.room.game!.turn?.phase;
      t.room.act(
        t.mover(),
        phase === 'select' ? { type: 'select', dice: [0] } : { type: MOVE[phase ?? 'draw'] },
      );
    }
    await tick();
    const [host, , spec] = t.all;
    const diffs = (c: Client, f: number) => changes(c, f).map((ch) => ch.gameDiff);
    expect(diffs(spec, from[2])).toEqual(diffs(host, from[0]));
    const mine = await t.guest.send('game:sync');
    expect(t.guest.view!.game).toEqual(mine.game.game);
    expect(spec.view!.game).toEqual(host.view!.game);
    expect(host.view!.game).toEqual(mine.game.game);
  });

  it('sends a dice tick as just the preview, without log or game', async () => {
    const t = await table('Prev');
    t.room.act(t.mover(), { type: 'draw' });
    t.room.act(t.mover(), { type: 'throw' });
    await tick();
    const from = t.all.map((c) => c.pushes.length);
    expect(t.room.setPreview(t.mover(), [0, 1])).toMatchObject({ ok: true });
    await tick();
    for (const [i, c] of t.all.entries()) {
      const sent = changes(c, from[i]);
      expect(sent).toEqual([{ n: c.view!.n, preview: [0, 1] }]);
    }
  });

  it('shows a computer takeover, a rename and a host handover to everybody, spectators included', async () => {
    const t = await table('Seat');
    const guest = t.room.seats.findIndex((s) => s.state === 'human' && s.playerId === t.guestId);
    expect(await t.host.send('seat:set', { seat: guest, mode: 'computer' })).toBeDefined();
    await tick();
    expect(t.room.leave(t.hostId)).toBeDefined();
    await tick();
    const live = t.spec!.view!;
    expect(live.hostId).toBe(t.room.hostId);
    expect(live.seats).toEqual(t.guest.view!.seats);
    expect(live.seats.some((s) => s.state === 'computer')).toBe(true);
    expect(live.log).toEqual(t.guest.view!.log);
  });

  it('sends spectator joins and leaves as the counter alone', async () => {
    const t = await table('Cnt', false);
    const from = t.all.map((c) => c.pushes.length);
    const spec = await Client.start('Cntspec');
    await spec.send('game:spectate', { gameId: t.id, password: '' });
    await tick();
    for (const [i, c] of t.all.entries()) {
      expect(changes(c, from[i])).toEqual([{ n: c.view!.n, spectators: 1 }]);
    }
    const mid = t.all.map((c) => c.pushes.length);
    await spec.send('game:leave');
    await tick();
    for (const [i, c] of t.all.entries()) {
      expect(changes(c, mid[i])).toEqual([{ n: c.view!.n, spectators: 0 }]);
    }
  });

  it('sends settings and pause with only their part', async () => {
    const t = await table('Set');
    const from = t.all.map((c) => c.pushes.length);
    await t.host.send('game:settings', { computerSpeed: 5, showBustProbability: true });
    await t.host.send('game:pause', { paused: true });
    await tick();
    for (const [i, c] of t.all.entries()) {
      const [settings, paused] = changes(c, from[i]);
      expect(settings).toEqual({
        n: settings.n,
        settings: { computerSpeed: 5, showBustProbability: true },
      });
      expect(paused).toMatchObject({ n: paused.n, paused: true });
      // the client drops the turn limit itself when the game is paused
      expect(Object.keys(paused).sort()).toEqual(['n', 'paused']);
    }
  });

  it('keeps a turn message the same size however long the log is', async () => {
    /** The throw message a spectator gets, with `before` log entries in the room already. */
    const throwSize = async (name: string, before: number) => {
      const t = await table(name, false);
      for (let i = 0; i < before; i++) t.room.log.push({ at: i, kind: 'turn', seat: 0 });
      const spec = await Client.start(`${name}watch`);
      await spec.send('game:spectate', { gameId: t.id, password: '' });
      // same card and dice in every table
      t.room.game = { ...t.room.game!, deck: ['star', 'bonus200'] };
      Object.assign(t.room, { rng: scriptedRandomInt([0, 1, 1, 2, 3, 5]) });
      t.room.act(t.mover(), { type: 'draw' });
      await tick();
      const from = spec.pushes.length;
      expect(t.room.act(t.mover(), { type: 'throw' })).toMatchObject({ ok: true });
      await tick();
      const [change] = changes(spec, from);
      expect(spec.view!.log.length).toBeGreaterThanOrEqual(before);
      expect(decodeLog(change.log)).toHaveLength(1);
      return size(change);
    };
    const early = await throwSize('SizeA', 0);
    const late = await throwSize('SizeB', 400);
    expect(early).toBeGreaterThan(100);
    expect(Math.abs(late - early)).toBeLessThanOrEqual(early * 0.1);
  });
});

describe('game:change size', () => {
  it('a card draw change in a 4-player game stays small', async () => {
    const host = await Client.start('Four0');
    const created = await create(host, 4, '');
    const id: string = created.game.id;
    const guests = await Promise.all([1, 2, 3].map((i) => Client.start(`Four${i}`)));
    for (const g of guests) await g.send('game:join', { gameId: id, password: '' });
    for (const c of [host, ...guests]) await c.send('seat:ready', { ready: true });
    expect(await host.send('game:start')).toEqual({ ok: true });
    const room = registry().get(id)!;
    room.game = { ...room.game!, deck: Array.from({ length: 30 }, () => 'bonus200' as const) };
    await tick();
    const from = host.pushes.length;
    const mover =
      room.game!.current === 0
        ? created.game.you.playerId
        : guests[room.game!.current - 1].view!.you.playerId;
    expect(room.act(mover, { type: 'draw' })).toMatchObject({ ok: true });
    await tick();
    const [change] = changes(host, from);
    // v12 value in the recording: 747; SC-001 asks for at least 60% less
    expect(size(change)).toBeLessThan(300);
  });
});

describe('no redundant values', () => {
  it('sends the timeout warning as the flag alone, with a new turn limit and no clearing before it', async () => {
    const t = await table('Warn');
    const idle = t.mover();
    const idleClient = idle === t.hostId ? t.host : t.guest;
    const seat = t.room.seats.find((s) => s.state === 'human' && s.playerId === idle);
    (seat as Any).timeouts = 1;
    const from = t.all.map((c) => c.pushes.length);
    (t.room as Any).turnExpired();
    await tick();
    const [change] = changes(idleClient, from[t.all.indexOf(idleClient)]);
    expect(change.you).toEqual({ timeoutWarning: true });
    expect(change.gameDiff.current).toBeDefined();
    expect(change.turnDeadline).toMatchObject({ phase: 'draw' });
    const keys = Object.keys(change);
    expect(keys.indexOf('turnDeadline')).toBeGreaterThan(-1);
    for (const c of t.all.filter((x) => x !== idleClient)) {
      const [other] = changes(c, from[t.all.indexOf(c)]);
      expect(other).not.toHaveProperty('you');
      expect(other.turnDeadline).not.toBeNull();
    }
  });

  it('sends nothing and keeps the number when nothing changes for a recipient', async () => {
    const t = await table('Quiet');
    const from = t.all.map((c) => c.pushes.length);
    const before = t.all.map((c) => c.view!.n);
    expect(t.room.setPaused(t.hostId, false)).toBeDefined();
    await tick();
    for (const [i, c] of t.all.entries()) {
      expect(changes(c, from[i])).toEqual([]);
      expect(c.view!.n).toBe(before[i]);
    }
  });

  it('sends no turn limit and no warning in a game where only computers are up', async () => {
    const host = await Client.start('Cpuhost');
    const created = await create(host, 2, '');
    await host.send('seat:set', { seat: 1, mode: 'computer', difficulty: 'easy', risk: 'none' });
    await host.send('seat:ready', { ready: true });
    expect(await host.send('game:start')).toEqual({ ok: true });
    await tick();
    const room = registry().get(created.game.id)!;
    const me = created.game.you.playerId;
    room.game = { ...room.game!, rules: { ...room.game!.rules, minimumPoints: 0 }, current: 0 };
    const from = host.pushes.length;
    for (const action of [{ type: 'draw' }, { type: 'throw' }] as const) room.act(me, action);
    await tick();
    for (const change of changes(host, from)) {
      expect(change.turnDeadline).not.toBeNull();
      expect(change.you?.timeoutWarning).not.toBe(true);
    }
    // the computer is up now: no limit is running
    room.game = { ...room.game!, current: 1 };
    room.setPaused(me, true);
    room.setPaused(me, false);
    await tick();
    expect(host.view!.turnDeadline).toBeUndefined();
  });
});

describe('compact log', () => {
  it('sends a bust as one group with the seat once', async () => {
    const t = await table('Bust');
    t.room.game = { ...t.room.game!, deck: ['bonus200', 'bonus200'] };
    // no die scores
    Object.assign(t.room, { rng: scriptedRandomInt([1, 2, 3, 5, 1, 2]) });
    t.room.act(t.mover(), { type: 'draw' });
    await tick();
    const from = t.all.map((c) => c.pushes.length);
    const seat = t.room.game!.current;
    expect(t.room.act(t.mover(), { type: 'throw' })).toMatchObject({ ok: true });
    await tick();
    for (const [i, c] of t.all.entries()) {
      const sent = changes(c, from[i]).flatMap((ch) => ch.log ?? []);
      expect(sent).toHaveLength(1);
      expect(sent[0].seat).toBe(seat);
      const kinds = sent[0].e.map((e: Any) => e.kind);
      expect(kinds.slice(-2)).toEqual(['bust', 'turnEnded']);
      expect(sent[0].e.some((e: Any) => 'seat' in e)).toBe(false);
    }
  });

  it('gives a snapshot as groups that decode to the room log, for a spectator and on game:sync', async () => {
    const t = await table('Snap', false);
    t.room.act(t.mover(), { type: 'draw' });
    await tick();
    const spec = await Client.start('Snapspec');
    const ack = await spec.send('game:spectate', { gameId: t.id, password: '' });
    expect(ack.game.log[0]).toHaveProperty('e');
    expect(decodeLog(ack.game.log)).toEqual(t.room.log);
    const sync = await t.host.send('game:sync');
    expect(sync.game.log.every((g: Any) => Array.isArray(g.e))).toBe(true);
    expect(decodeLog(sync.game.log)).toEqual(t.room.log);
  });

  it('keeps a client who joined late and one who followed every change on the same log after LOG_CAP', async () => {
    const t = await table('Cap', false);
    for (let i = 0; i < LOG_CAP - 2; i++) t.room.log.push({ at: i, kind: 'joined', seat: 0 });
    await t.host.send('game:sync');
    for (let i = 0; i < 12; i++) {
      const phase = t.room.game!.turn?.phase;
      t.room.act(
        t.mover(),
        phase === 'select' ? { type: 'select', dice: [0] } : { type: MOVE[phase ?? 'draw'] },
      );
    }
    await tick();
    expect(t.room.log).toHaveLength(LOG_CAP);
    const late = await Client.start('Caplate');
    await late.send('game:spectate', { gameId: t.id, password: '' });
    expect(late.view!.log).toEqual(t.host.view!.log);
    expect(late.view!.logBase).toBe(t.host.view!.logBase);
    expect(t.host.view!.logBase).toBeGreaterThan(0);
    expect(t.host.view!.log).toEqual(t.room.log);
  });
});

describe('snapshots when entering', () => {
  it('gives a rejoining player every name, the whole log and a number the next change continues', async () => {
    const t = await table('Rej', false);
    t.room.act(t.mover(), { type: 'draw' });
    await tick();
    t.guest.socket.close();
    await t.host.untilView((v) => v.seats.some((s) => s.connected === false));
    const back = await Client.connect();
    const ack = await back.send('session:start', {
      token: t.guest.token,
      nickname: 'x',
      protocolVersion: PROTOCOL_VERSION,
    });
    expect(ack.game.seats.map((s: Any) => s.nickname)).toEqual(['Rejhost', 'Rejguest']);
    expect(decodeLog(ack.game.log)).toEqual(t.room.log);
    expect(ack.game.logBase).toBe(t.room.logBase);
    await t.host.untilView((v) => v.seats.every((s) => s.state !== 'human' || s.connected));
    expect(t.room.act(t.mover(), { type: 'throw' })).toMatchObject({ ok: true });
    await tick();
    // changes that arrive around the ack are either in it or continue it
    const numbers = changes(back).map((c) => c.n);
    expect(numbers.filter((n) => n > ack.game.n)).toEqual(
      Array.from({ length: back.view!.n - ack.game.n }, (_, i) => ack.game.n + 1 + i),
    );
    expect(back.view!.n).toBeGreaterThan(ack.game.n);
    expect(back.gaps).toBe(0);
    expect(back.view!.game).toEqual(t.host.view!.game);
  });

  it('gives a watcher who starts late the whole long log', async () => {
    const t = await table('Late', false);
    for (let i = 0; i < 300; i++) t.room.log.push({ at: i, kind: 'turn', seat: 0 });
    const spec = await Client.start('Latespec');
    const ack = await spec.send('game:spectate', { gameId: t.id, password: '' });
    expect(decodeLog(ack.game.log).length).toBeGreaterThanOrEqual(300);
    expect(ack.game.seats.map((s: Any) => s.nickname)).toEqual(['Latehost', 'Lateguest']);
  });

  it('gives everybody who stays a snapshot when a rematch starts', async () => {
    const t = await table('Rem', false);
    t.room.phase = 'finished';
    await t.host.send('game:settings', { spectating: true });
    const from = t.all.map((c) => c.pushes.length);
    expect(await t.host.send('rematch:start', { round: 1 })).toMatchObject({ ok: true });
    await tick();
    const host = t.host.pushes.slice(from[0]).find((p) => p.event === 'game:snapshot');
    expect(host?.payload.game).toMatchObject({ round: 2, phase: 'lobby' });
    expect(t.host.view).toMatchObject({ round: 2, phase: 'lobby' });
    // the guest waits behind the finished table and hears about the open seat
    await t.guest.untilView((v) => v.rematch === 'open');
    expect(t.guest.view).toMatchObject({ round: 1, phase: 'finished', rematch: 'open' });
    const ack = await t.guest.send('rematch:join', { round: 1 });
    expect(ack.game).toMatchObject({ round: 2, phase: 'lobby' });
  });

  it('turns a waiting player’s open seat into a closed one with one small change', async () => {
    const t = await table('Cls', false);
    t.room.phase = 'finished';
    await t.host.send('rematch:start', { round: 1 });
    await t.guest.untilView((v) => v.rematch === 'open');
    const from = t.guest.pushes.length;
    await t.host.send('seat:ready', { ready: true });
    t.room.setReady(t.hostId, true);
    await tick();
    expect(changes(t.guest, from).every((c) => c.rematch === undefined)).toBe(true);
  });
});

describe('game:sync', () => {
  it('returns the view a rejoin would, to a player and to a spectator, and disturbs nobody', async () => {
    const t = await table('Syn');
    t.room.act(t.mover(), { type: 'draw' });
    await tick();
    const from = t.all.map((c) => c.pushes.length);
    for (const c of [t.guest, t.spec!]) {
      const ack = await c.send('game:sync');
      expect(ack).toMatchObject({ ok: true });
      expect(ack.game.n).toBe(c.view!.n);
      expect(decodeLog(ack.game.log)).toEqual(t.room.log);
    }
    expect((await t.host.send('game:sync')).game.you.seat).toBe(0);
    await tick();
    expect(t.all.map((c) => c.pushes.length)).toEqual(from);
    t.room.act(t.mover(), { type: 'throw' });
    await tick();
    for (const c of t.all) expect(c.gaps).toBe(0);
  });

  it('refuses without a session or a game', async () => {
    const anon = await Client.connect();
    expect(await anon.send('game:sync')).toMatchObject({ reason: 'noSession' });
    const lonely = await Client.start('Synlonely');
    expect(await lonely.send('game:sync')).toMatchObject({ reason: 'notInGame' });
  });

  it('allows five calls in ten seconds, then answers locked', async () => {
    const t = await table('Lim', false);
    for (let i = 0; i < 5; i++) expect(await t.guest.send('game:sync')).toMatchObject({ ok: true });
    const sixth = await t.guest.send('game:sync');
    expect(sixth).toMatchObject({ ok: false, reason: 'locked' });
    expect(sixth.retryAfterMs).toBeGreaterThan(0);
    // another session is not affected
    expect(await t.host.send('game:sync')).toMatchObject({ ok: true });
  });

  it('repairs a lost change: the client syncs and ends with the view of an undisturbed one', async () => {
    const t = await table('Lost', false);
    const before = t.guest.view!.n;
    let lost = 0;
    t.guest.lose = () => lost++ === 0;
    await t.host.send('game:pause', { paused: true });
    await tick();
    t.guest.lose = undefined;
    expect(t.guest.view!.n).toBe(before);
    expect(t.guest.view!.paused).toBe(false);
    await t.host.send('game:pause', { paused: false });
    await tick();
    // the next change shows a gap and is not applied
    expect(t.guest.gaps).toBe(1);
    expect(t.guest.view!.n).toBe(before);
    // what SocketService does on a gap
    const ack = await t.guest.send('game:sync');
    expect(ack.game.n).toBe(before + 2);
    expect(t.guest.view).toEqual({ ...t.host.view!, n: before + 2, you: t.guest.view!.you });
    await t.host.send('game:pause', { paused: true });
    await tick();
    expect(t.guest.gaps).toBe(1);
    expect(t.guest.view!.n).toBe(before + 3);
  });
});
