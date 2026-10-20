import type { LogEntry, WireLogEntry, WireLogGroup } from './protocol.js';
import type { Event } from './types.js';

/** Every engine event type; the record type makes the compiler check the list is complete. */
const EVENT_TYPE_SET: Record<Event['type'], true> = {
  cardDrawn: true,
  thrown: true,
  selected: true,
  volleLotte: true,
  bust: true,
  banked: true,
  turnLost: true,
  turnEnded: true,
  deckReshuffled: true,
  penalty: true,
  gameOver: true,
};
export const EVENT_TYPES = Object.keys(EVENT_TYPE_SET) as Event['type'][];

const isEventType = (kind: string): kind is Event['type'] => kind in EVENT_TYPE_SET;

const isEvent = (data: LogEntry['data']): data is Event =>
  typeof data === 'object' && data !== null;

/** The entry without its time stamp, flat; `seat` only if the group does not carry it. */
function encodeEntry(entry: LogEntry, groupSeat: number | undefined): WireLogEntry {
  const own = groupSeat === undefined && entry.seat !== undefined ? { seat: entry.seat } : {};
  if (entry.kind === 'turn' && isEvent(entry.data)) {
    const { type, ...fields } = entry.data;
    return { kind: type, ...own, ...fields };
  }
  const data = entry.data as number | string | undefined;
  return { kind: entry.kind, ...own, ...(data === undefined ? {} : { data }) };
}

/** The seat all entries share, if they have one. */
function commonSeat(entries: readonly LogEntry[]): number | undefined {
  const seat = entries[0].seat;
  return seat !== undefined && entries.every((e) => e.seat === seat) ? seat : undefined;
}

/** Groups consecutive entries with the same time stamp; see `decodeLog` for the inverse. */
export function encodeLog(entries: readonly LogEntry[]): WireLogGroup[] {
  const groups: LogEntry[][] = [];
  for (const entry of entries) {
    const last = groups.at(-1);
    if (last && last[0].at === entry.at) last.push(entry);
    else groups.push([entry]);
  }
  return groups.map((group) => {
    const seat = commonSeat(group);
    return {
      at: group[0].at,
      ...(seat === undefined ? {} : { seat }),
      e: group.map((entry) => encodeEntry(entry, seat)),
    };
  });
}

function decodeEntry(at: number, groupSeat: number | undefined, wire: WireLogEntry): LogEntry {
  const { kind, seat: ownSeat, ...rest } = wire;
  const seat = ownSeat ?? groupSeat;
  const where = seat === undefined ? {} : { seat };
  if (isEventType(kind))
    return { at, kind: 'turn', ...where, data: { type: kind, ...rest } as Event };
  const { data } = rest;
  return { at, kind: kind as LogEntry['kind'], ...where, ...(data === undefined ? {} : { data }) };
}

/** The exact inverse of `encodeLog`. */
export const decodeLog = (groups: readonly WireLogGroup[]): LogEntry[] =>
  groups.flatMap((g) => g.e.map((wire) => decodeEntry(g.at, g.seat, wire)));
