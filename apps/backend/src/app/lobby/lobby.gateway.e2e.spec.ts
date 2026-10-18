import {
  chooseAction,
  defaultRules,
  seededRandomInt,
  PROTOCOL_VERSION,
  type GameState,
  type GameView,
} from 'game-rules';
import { Client, create, startApp, stopApp, type Any } from './testing/client';

// End-to-end flows over real sockets: full games with bots, disconnects and cleanup.
// Slow (about 30 s), so they run only through `npm run test:e2e`, not in CI.
beforeAll(startApp);
afterAll(stopApp);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const lastState = (c: Client): GameView | undefined =>
  [...c.pushes].reverse().find((p) => p.event === 'game:state')?.payload.game;
const waitFor = async (pred: () => boolean, ms = 5000) => {
  for (let waited = 0; waited < ms && !pred(); waited += 10) await sleep(10);
  if (!pred()) throw new Error('condition not reached');
};

/** Plays the client's seat with the computer strategy, one action per distinct turn state. */
function autoPlay(c: Client): void {
  let sent = '';
  const rng = seededRandomInt(c.token.length + Date.now());
  c.socket.on('game:state', ({ game }: { game: GameView }) => {
    const state = game.game;
    if (game.phase !== 'running' || !state?.turn || state.result) return;
    const engine = game.seats
      .slice(0, game.you.seat)
      .filter((s) => s.state === 'human' || s.state === 'computer').length;
    if (state.current !== engine) return;
    const key = JSON.stringify([
      state.current,
      state.turn,
      state.players,
      game.log.at(-1)?.at,
      game.log.length,
    ]);
    if (key === sent) return;
    sent = key;
    const action = chooseAction({ ...state, deck: [] } as unknown as GameState, 'medium', rng);
    void c.send('turn:action', { action });
  });
}

/** What every client must agree on, whoever asks. */
const shared = (g: GameView) => ({ game: g.game, seats: g.seats, phase: g.phase, log: g.log });

describe('integration flows', () => {
  type Scale = (ms: number) => number;
  let scale: Scale = (ms) => ms;
  const realSetTimeout = global.setTimeout;
  const fromRoom = () => /game-room|game-registry/.test(new Error().stack ?? '');

  beforeAll(() => {
    jest
      .spyOn(global, 'setTimeout')
      .mockImplementation(((fn: () => void, ms?: number, ...a: []) =>
        realSetTimeout(fn, ms === undefined ? ms : scale(ms), ...a)) as never);
  });
  afterAll(() => jest.restoreAllMocks());

  const quickRules = () => ({ ...defaultRules(), targetScore: 1000 });
  const gameOf = async (names: string[], seats: number, computers = 0) => {
    const [host, ...guests] = await Promise.all(names.map((n) => Client.start(n)));
    const { game } = await host.send('game:create', {
      name: 'Flow',
      password: 'secret',
      seats,
      rules: quickRules(),
    });
    for (const g of guests) await g.send('game:join', { gameId: game.id, password: 'secret' });
    for (let i = 0; i < computers; i++)
      await host.send('seat:set', { seat: names.length + i, mode: 'computer', difficulty: 'easy' });
    for (let i = names.length + computers; i < seats; i++)
      await host.send('seat:set', { seat: i, mode: 'locked' });
    for (const c of [host, ...guests]) await c.send('seat:ready', { ready: true });
    return { host, guests, all: [host, ...guests], id: game.id as string };
  };
  const finish = async (all: Client[]) => {
    await waitFor(() => all.every((c) => lastState(c)?.phase === 'finished'), 55_000);
    const views = all.map((c) => lastState(c) as GameView);
    views.forEach((v) => expect(shared(v)).toEqual(shared(views[0])));
    expect(views[0].game?.result?.ranking.length).toBeGreaterThan(0);
  };

  describe('full games (T027)', () => {
    beforeAll(() => {
      scale = (ms) => (fromRoom() ? Math.max(1, Math.ceil(ms / 50)) : ms);
    });

    it.each([2, 8])(
      '%i human clients play to the same ranking',
      async (n) => {
        const { host, all } = await gameOf(
          Array.from({ length: n }, (_, i) => `Bot${n}x${i}`),
          n,
        );
        all.forEach(autoPlay);
        expect(await host.send('game:start')).toEqual({ ok: true });
        await finish(all);
      },
      60_000,
    );

    it('plays with computers in the other seats', async () => {
      const { host, all } = await gameOf(['Mix0', 'Mix1'], 5, 3);
      all.forEach(autoPlay);
      await host.send('game:start');
      await finish(all);
    }, 60_000);

    it('rejects out-of-turn and illegal actions without a push or state change', async () => {
      const { host, guests, all } = await gameOf(['Rej0', 'Rej1'], 2);
      await host.send('game:start');
      const state = await host.until('game:state', (s) => s.game.phase === 'running');
      const [mover, waiter] = state.game.game.current === 0 ? [host, guests[0]] : [guests[0], host];
      await sleep(50);
      const before = all.map((c) => c.pushes.length);
      expect(await waiter.send('turn:action', { action: { type: 'draw' } })).toMatchObject({
        reason: 'notYourTurn',
      });
      expect(await mover.send('turn:action', { action: { type: 'bank' } })).toMatchObject({
        reason: 'rejected',
        engine: 'wrongPhase',
      });
      expect(await mover.send('turn:action', { action: { type: 'fly' } })).toMatchObject({
        reason: 'invalidRequest',
      });
      await sleep(100);
      expect(all.map((c) => c.pushes.length)).toEqual(before);

      // the same action twice: the second one finds another phase and changes nothing
      const seen = waiter.pushes.length;
      const t0 = Date.now();
      expect(await mover.send('turn:action', { action: { type: 'draw' } })).toEqual({ ok: true });
      await waitFor(() => waiter.pushes.length > seen);
      expect(Date.now() - t0).toBeLessThan(1000);
      const after = waiter.pushes.length;
      expect(await mover.send('turn:action', { action: { type: 'draw' } })).toMatchObject({
        ok: false,
      });
      await sleep(100);
      expect(waiter.pushes).toHaveLength(after);
    });

    it('keeps two parallel games independent', async () => {
      const a = await gameOf(['ParA0', 'ParA1'], 2);
      const b = await gameOf(['ParB0', 'ParB1'], 2);
      [...a.all, ...b.all].forEach(autoPlay);
      await Promise.all([a.host.send('game:start'), b.host.send('game:start')]);
      await finish(a.all);
      await finish(b.all);
      expect(lastState(a.host)?.id).not.toBe(lastState(b.host)?.id);
      expect(lastState(a.host)?.seats.map((s) => s.nickname)).not.toContain('ParB0');
      expect(lastState(b.host)?.log.length).toBeGreaterThan(0);
    }, 60_000);
  });

  describe('connection loss and cleanup (T034)', () => {
    beforeAll(() => {
      // grace 30 s, lobby cleanup 15 min, running cleanup 24 h, compressed
      scale = (ms) => ({ 30_000: 1500, [15 * 60_000]: 700, [24 * 3_600_000]: 3000 })[ms] ?? ms;
    });

    it('warns on disconnect and restores the exact state on reconnect', async () => {
      const { host, guests } = await gameOf(['Con0', 'Con1'], 2);
      const guest = guests[0];
      await host.send('game:start');
      await host.until('game:state', (s) => s.game.phase === 'running');
      await sleep(50);
      const before = shared(lastState(host) as GameView).game;

      guest.socket.close();
      const warned = await host.until('game:state', (s) => s.game.seats[1].connected === false);
      expect(warned.game.log.at(-1)).toMatchObject({ kind: 'disconnected', seat: 1 });

      const back = await Client.start('ignored', guest.token);
      const resumed = await back.send('session:start', {
        token: guest.token,
        nickname: 'x',
        protocolVersion: PROTOCOL_VERSION,
      });
      expect(resumed.game.you.seat).toBe(1);
      expect(resumed.game.seats[1]).toMatchObject({ state: 'human', connected: true });
      expect(resumed.game.game).toEqual(before);
      await host.until('game:state', (s) => s.game.log.at(-1)?.kind === 'reconnected');
    });

    it('hands the seat to a computer after the grace period, and the player can rejoin', async () => {
      const { host, guests, id } = await gameOf(['Exp0', 'Exp1'], 2);
      const guest = guests[0];
      await host.send('game:start');
      await host.until('game:state', (s) => s.game.phase === 'running');
      guest.socket.close();
      const replaced = await host.until(
        'game:state',
        (s) => s.game.seats[1].state === 'computer' && s.game.seats[1].former,
      );
      expect(replaced.game.seats[1].former).toEqual({ nickname: 'Exp1' });
      expect(
        replaced.game.log.some((l: Any) => l.kind === 'replaced' && l.data === 'disconnected'),
      ).toBe(true);

      const back = await Client.start('ignored', guest.token);
      expect(await back.send('game:rejoin', { gameId: id })).toMatchObject({
        ok: true,
        game: { you: { seat: 1 } },
      });
      expect(await back.send('game:rejoin', { gameId: id })).toMatchObject({
        reason: 'alreadyInGame',
      });
    });

    it('hands the host role over when the host leaves or drops', async () => {
      const left = await gameOf(['Hand0', 'Hand1'], 3);
      expect(await left.host.send('game:leave')).toMatchObject({ ok: true });
      const guest = left.guests[0];
      await waitFor(() => {
        const v = lastState(guest);
        return !!v && v.seats[0].state === 'open' && v.hostId === v.you.playerId;
      });

      const dropped = await gameOf(['Drop0', 'Drop1'], 3);
      dropped.host.socket.close();
      await dropped.guests[0].until('game:state', (s) => s.game.seats[0].state === 'open');
      const view = lastState(dropped.guests[0]) as GameView;
      expect(view.hostId).toBe(view.you.playerId);
      expect(view.log.some((l) => l.kind === 'hostChanged')).toBe(true);
    });

    it('closes an abandoned lobby after the cleanup time, a reconnect cancels it', async () => {
      const watcher = await Client.start('Watcher');
      const ids = async () => (await watcher.send('lobby:list')).games.map((g: Any) => g.id);

      const gone = await Client.start('Gone');
      const g1 = (await create(gone)).game.id;
      gone.socket.close();
      await sleep(900);
      expect(await ids()).not.toContain(g1);

      const kept = await Client.start('Kept');
      const g2 = (await create(kept)).game.id;
      kept.socket.close();
      await sleep(300);
      await Client.start('ignored', kept.token);
      await sleep(1000);
      expect(await ids()).toContain(g2);
    });

    it('closes an abandoned running game after 24 h, a rejoin cancels it', async () => {
      const watcher = await Client.start('Watcher2');
      const ids = async () => (await watcher.send('lobby:list')).games.map((g: Any) => g.id);

      const dead = await gameOf(['Dead0', 'Dead1'], 2);
      await dead.host.send('game:start');
      dead.all.forEach((c) => c.socket.close());
      let listed = [dead.id];
      for (let i = 0; i < 100 && listed.includes(dead.id); i++) {
        await sleep(100);
        listed = await ids();
      }
      expect(listed).not.toContain(dead.id);

      const alive = await gameOf(['Live0', 'Live1'], 2);
      await alive.host.send('game:start');
      alive.all.forEach((c) => c.socket.close());
      await sleep(1700); // both seats now belong to computers
      const back = await Client.start('ignored', alive.host.token);
      expect(await back.send('game:rejoin', { gameId: alive.id })).toMatchObject({ ok: true });
      await sleep(2000);
      expect(await ids()).toContain(alive.id);
    }, 15_000);
  });
});
