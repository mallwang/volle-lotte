import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { defaultRules, seededRandomInt } from 'game-rules';
import { autoplay } from '../testing/autoplay';
import { Client, registry, startApp, stopApp } from '../testing/client';
import { bytesPerClient, largestSeries, Meter, rows } from '../testing/traffic';

// Plays full games over real sockets and reports the bytes every client receives, per event.
// Run with `npm run measure:socket -- --label <name>`; see docs/socket-traffic.md.
const SEED = 20260101;
const SPECTATORS_JOIN_AFTER_TURNS = 3;
const LABEL = process.env['MEASURE_LABEL'] ?? 'run';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (pred: () => boolean, ms: number) => {
  for (let waited = 0; waited < ms && !pred(); waited += 10) await sleep(10);
  if (!pred()) throw new Error('condition not reached');
};

interface Scenario {
  players: number;
  spectators: number;
}
const SCENARIOS: Scenario[] = [
  { players: 2, spectators: 0 },
  { players: 2, spectators: 2 },
  { players: 8, spectators: 0 },
  { players: 8, spectators: 2 },
];

/** Eleven values from the first to the last, evenly spread: shows how the size grows over the game. */
const sampled = (sizes: number[]): number[] =>
  Array.from({ length: 11 }, (_, i) => sizes[Math.round((i / 10) * (sizes.length - 1))]);

/** Repo root: the first parent with an `nx.json`. */
function repoRoot(): string {
  let dir = process.cwd();
  while (!existsSync(path.join(dir, 'nx.json')) && path.dirname(dir) !== dir)
    dir = path.dirname(dir);
  return dir;
}

async function play({ players, spectators }: Scenario) {
  const meters: Meter[] = [];
  const stops: (() => void)[] = [];
  const humans = await Promise.all(
    Array.from({ length: players }, (_, i) => Client.start(`Player${i}`)),
  );
  const [host] = humans.map((c) => new Meter(c, 'player'));
  const created = await host.send('game:create', {
    name: 'Measure',
    password: 'secret',
    seats: players,
    rules: defaultRules(),
  });
  const gameId: string = created.game.id;
  const room = registry().get(gameId);
  if (!room) throw new Error('no room');
  // same dice and names in every run of a scenario
  Object.assign(room, { rng: seededRandomInt(SEED), nameRng: seededRandomInt(SEED + 1) });
  meters.push(host);
  for (const c of humans.slice(1)) {
    const m = new Meter(c, 'player');
    meters.push(m);
    await m.send('game:join', { gameId, password: 'secret' });
  }
  for (const m of meters.length ? [host, ...meters.filter((x) => x !== host)] : []) {
    await m.send('seat:ready', { ready: true });
  }
  meters.unshift(host);
  const unique = [...new Set(meters)];
  unique.forEach((m, i) => {
    const playerId = room.seats.flatMap((s) => (s.state === 'human' ? [s] : []))[i]?.playerId;
    if (playerId) stops.push(autoplay(m.client, playerId, gameId, SEED + i));
  });
  await host.send('game:start');

  const watchers: Meter[] = [];
  if (spectators > 0) {
    await waitFor(
      () => room.log.filter((e) => e.kind === 'turn').length >= SPECTATORS_JOIN_AFTER_TURNS,
      60_000,
    );
    for (let i = 0; i < spectators; i++) {
      const m = new Meter(await Client.start(`Watcher${i}`), 'spectator');
      watchers.push(m);
      await m.send('game:spectate', { gameId, password: 'secret' });
    }
    // one of them reloads the page: same token, new socket
    const first = watchers[0];
    first.client.socket.close();
    const back = new Meter(await Client.start('Watcher0', first.client.token), 'spectator');
    watchers.push(back);
  }
  await waitFor(() => room.phase === 'finished', 120_000);
  await sleep(300);
  stops.forEach((stop) => stop());
  return [...unique, ...watchers];
}

describe('socket traffic', () => {
  const realSetTimeout = global.setTimeout;
  const fromRoom = () => /game-room|game-registry/.test(new Error().stack ?? '');
  const report: unknown[] = [];

  beforeAll(async () => {
    // the waits of the server (computer pacing, notices) run 50 times faster; the bytes do not change
    jest
      .spyOn(global, 'setTimeout')
      .mockImplementation(((fn: () => void, ms?: number, ...a: []) =>
        realSetTimeout(
          fn,
          ms === undefined || !fromRoom() ? ms : Math.max(1, Math.ceil(ms / 50)),
          ...a,
        )) as never);
    await startApp();
  });
  afterAll(async () => {
    await stopApp();
    jest.restoreAllMocks();
    const dir = path.join(repoRoot(), 'tmp', 'socket-traffic');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, `${LABEL}.json`), JSON.stringify(report, null, 2));
    console.log(`written tmp/socket-traffic/${LABEL}.json`);
  });

  it.each(SCENARIOS)(
    '$players players, $spectators spectators',
    async (scenario) => {
      const meters = await play(scenario);
      const table = rows(meters);
      const series = {
        player: largestSeries(meters, 'player'),
        spectator: largestSeries(meters, 'spectator'),
      };
      const totals = {
        bytesPerPlayer: bytesPerClient(meters, 'player'),
        bytesPerSpectator: bytesPerClient(meters, 'spectator'),
      };
      report.push({ scenario: { ...scenario, seed: SEED }, rows: table, series, totals });
      const lines = [
        `\n## ${scenario.players} players, ${scenario.spectators} spectators (${LABEL})`,
        '| event | role | count | total | avg | max |',
        '|---|---|---:|---:|---:|---:|',
        ...table.map(
          (r) =>
            `| ${r.event} | ${r.role} | ${r.count} | ${r.bytesTotal} | ${r.bytesAvg} | ${r.bytesMax} |`,
        ),
        `bytes per player: ${totals.bytesPerPlayer}, per spectator: ${totals.bytesPerSpectator}`,
      ];
      for (const [role, s] of Object.entries(series))
        if (s.sizes.length)
          lines.push(
            `${role}, ${s.event}, ${s.sizes.length} messages, size at 0%..100% in 10% steps: ${sampled(s.sizes).join(' ')}`,
          );
      console.log(lines.join('\n'));
      expect(table.length).toBeGreaterThan(0);
    },
    180_000,
  );
});
