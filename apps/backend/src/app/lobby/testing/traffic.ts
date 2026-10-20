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

  constructor(
    readonly client: Client,
    readonly role: Role,
  ) {
    client.socket.onAny((event: string, payload: unknown) =>
      this.record(event, frameBytes(event, payload)),
    );
  }

  /** `client.send`, additionally counting the ack as `ack:<event>`. */
  async send(event: string, payload?: unknown): Promise<Any> {
    const ack = await this.client.send(event, payload);
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
