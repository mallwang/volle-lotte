import type { Client, Any } from './client';

export type Role = 'player' | 'spectator';

interface Stat {
  count: number;
  bytes: number;
  max: number;
  /** Sizes in arrival order. */
  series: number[];
}

export interface Row {
  event: string;
  role: Role;
  count: number;
  bytesTotal: number;
  bytesAvg: number;
  bytesMax: number;
}

/** Size of the Socket.IO text frame body of one event: the JSON array of event name and payload. */
export const frameBytes = (event: string, payload: unknown): number =>
  Buffer.byteLength(JSON.stringify(payload === undefined ? [event] : [event, payload]));

/**
 * Counts what one client receives: every pushed event and every ack, by event name.
 * It does not know any event name, so the same script measures any protocol version.
 */
export class Meter {
  readonly stats = new Map<string, Stat>();
  /** Every received frame as `[event, payload]`, for the key-table estimate. */
  readonly frames: [string, unknown][] = [];

  constructor(
    readonly client: Client,
    readonly role: Role,
  ) {
    client.socket.onAny((event: string, payload: unknown) => {
      this.frames.push([event, payload]);
      this.record(event, frameBytes(event, payload));
    });
  }

  /** `client.send`, additionally counting the ack as `ack:<event>`. */
  async send(event: string, payload?: unknown): Promise<Any> {
    const ack = await this.client.send(event, payload);
    this.frames.push([`ack:${event}`, ack]);
    this.record(`ack:${event}`, Buffer.byteLength(JSON.stringify([ack])));
    return ack;
  }

  private record(event: string, bytes: number): void {
    const stat = this.stats.get(event) ?? { count: 0, bytes: 0, max: 0, series: [] };
    stat.count++;
    stat.bytes += bytes;
    stat.max = Math.max(stat.max, bytes);
    stat.series.push(bytes);
    this.stats.set(event, stat);
  }
}

/** One row per event and role, summed over the meters of that role. */
export function rows(meters: readonly Meter[]): Row[] {
  const by = new Map<string, Row>();
  for (const m of meters) {
    for (const [event, s] of m.stats) {
      const key = `${m.role}\0${event}`;
      const row = by.get(key) ?? {
        event,
        role: m.role,
        count: 0,
        bytesTotal: 0,
        bytesAvg: 0,
        bytesMax: 0,
      };
      row.count += s.count;
      row.bytesTotal += s.bytes;
      row.bytesMax = Math.max(row.bytesMax, s.max);
      by.set(key, row);
    }
  }
  for (const row of by.values()) row.bytesAvg = Math.round(row.bytesTotal / row.count);
  return [...by.values()].sort(
    (a, b) => a.role.localeCompare(b.role) || b.bytesTotal - a.bytesTotal,
  );
}

/** Bytes received per person of a role; a reload (same token, new socket) counts as the same person. */
export function bytesPerClient(meters: readonly Meter[], role: Role): number {
  const of = meters.filter((m) => m.role === role);
  const people = new Set(of.map((m) => m.client.token)).size;
  if (people === 0) return 0;
  const total = of.reduce(
    (sum, m) => sum + [...m.stats.values()].reduce((a, s) => a + s.bytes, 0),
    0,
  );
  return Math.round(total / people);
}

/** Sizes of the largest event of a role over the game, in arrival order (shows growth). */
export function largestSeries(
  meters: readonly Meter[],
  role: Role,
): { event: string; sizes: number[] } {
  const event = rows(meters).find((r) => r.role === role)?.event ?? '';
  const sizes = meters
    .filter((m) => m.role === role)
    .map((m) => m.stats.get(event)?.series ?? [])
    .reduce<number[]>((best, s) => (s.length > best.length ? s : best), []);
  return { event, sizes };
}

const countKeys = (value: unknown, counts: Map<string, number>): void => {
  if (Array.isArray(value)) value.forEach((v) => countKeys(v, counts));
  else if (typeof value === 'object' && value !== null)
    for (const [k, v] of Object.entries(value)) {
      counts.set(k, (counts.get(k) ?? 0) + 1);
      countKeys(v, counts);
    }
};

const rename = (value: unknown, table: Map<string, string>): unknown => {
  if (Array.isArray(value)) return value.map((v) => rename(v, table));
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [table.get(k) ?? k, rename(v, table)]),
  );
};

/** `a`..`z`, `A`..`Z`, then two letters: unique short names, handed out by frequency. */
const shortNames = function* (): Generator<string> {
  const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (const a of letters) yield a;
  for (const a of letters) for (const b of letters) yield a + b;
};

/**
 * Throw-away estimate for the short-key decision: every object key that occurs in the received
 * frames gets a unique short name (most frequent first), the frames are measured again, and the
 * bytes per person of each role are returned with and without it. Nothing in production reads it.
 */
export function keyTableEstimate(meters: readonly Meter[]): {
  keys: number;
  perPlayer: { plain: number; short: number };
  perSpectator: { plain: number; short: number };
} {
  const counts = new Map<string, number>();
  for (const m of meters) for (const [, payload] of m.frames) countKeys(payload, counts);
  const names = shortNames();
  const table = new Map(
    [...counts].sort((a, b) => b[1] - a[1]).map(([key]) => [key, names.next().value as string]),
  );
  const short = (role: Role): number => {
    const of = meters.filter((m) => m.role === role);
    const people = new Set(of.map((m) => m.client.token)).size;
    if (people === 0) return 0;
    const total = of.reduce(
      (sum, m) =>
        sum +
        m.frames.reduce((a, [event, payload]) => a + frameBytes(event, rename(payload, table)), 0),
      0,
    );
    return Math.round(total / people);
  };
  return {
    keys: table.size,
    perPlayer: { plain: bytesPerClient(meters, 'player'), short: short('player') },
    perSpectator: { plain: bytesPerClient(meters, 'spectator'), short: short('spectator') },
  };
}
