import { LOG_KINDS, type LogEntry } from './protocol.js';
import { replayViews } from './testing/replay.js';
import type { Event } from './types.js';
import { decodeLog, encodeLog, EVENT_TYPES } from './wire-log.js';

const result = {
  reason: 'targetScore' as const,
  winner: 1,
  ranking: [
    { rank: 1, players: [1] },
    { rank: 2, players: [0] },
  ],
};

const events: Event[] = [
  { type: 'cardDrawn', card: 'plusMinus' },
  { type: 'thrown', dice: [1, 2, 3] },
  { type: 'selected', dice: [1], points: 100 },
  { type: 'volleLotte' },
  { type: 'bust', lost: 300 },
  { type: 'banked', points: 500 },
  { type: 'turnLost', lost: 100 },
  { type: 'turnEnded', next: 2 },
  { type: 'deckReshuffled' },
  { type: 'penalty', player: 1, lost: 500 },
  { type: 'gameOver', result },
];

const plainKinds = LOG_KINDS.filter((k) => k !== 'turn');

describe('wire log', () => {
  it('has a wire kind for every event type and none that is also a log kind', () => {
    expect(EVENT_TYPES.sort()).toEqual(events.map((e) => e.type).sort());
    const logKinds: string[] = [...LOG_KINDS];
    expect(EVENT_TYPES.filter((t) => logKinds.includes(t))).toEqual([]);
  });

  it('round-trips every log kind and every event type', () => {
    const log: LogEntry[] = [
      ...plainKinds.map((kind, i) => ({ at: 100 + i, kind, seat: i % 3, data: `x${i}` })),
      ...plainKinds.map((kind, i) => ({ at: 200 + i, kind, data: i })),
      ...plainKinds.map((kind, i) => ({ at: 300 + i, kind })),
      ...events.map((data, i) => ({ at: 400 + i, kind: 'turn' as const, seat: i % 2, data })),
      ...events.map((data, i) => ({ at: 500 + i, kind: 'turn' as const, data })),
      { at: 600, kind: 'turn' },
    ];
    expect(decodeLog(encodeLog(log))).toEqual(log);
  });

  it('round-trips an empty log', () => {
    expect(encodeLog([])).toEqual([]);
    expect(decodeLog([])).toEqual([]);
  });

  it('puts a bust into one group with the seat once', () => {
    const at = 1792499290000;
    const log: LogEntry[] = [
      { at, kind: 'turn', seat: 1, data: { type: 'bust', lost: 300 } },
      { at, kind: 'turn', seat: 1, data: { type: 'turnEnded', next: 2 } },
    ];
    expect(encodeLog(log)).toEqual([
      {
        at,
        seat: 1,
        e: [
          { kind: 'bust', lost: 300 },
          { kind: 'turnEnded', next: 2 },
        ],
      },
    ]);
  });

  it('keeps a seat per entry when the group has no common seat', () => {
    const log: LogEntry[] = [
      { at: 5, kind: 'turn', seat: 0, data: { type: 'bust', lost: 1 } },
      { at: 5, kind: 'turn', seat: 1, data: { type: 'turnEnded', next: 1 } },
      { at: 5, kind: 'left' },
    ];
    expect(encodeLog(log)).toEqual([
      {
        at: 5,
        e: [
          { kind: 'bust', seat: 0, lost: 1 },
          { kind: 'turnEnded', seat: 1, next: 1 },
          { kind: 'left' },
        ],
      },
    ]);
    expect(decodeLog(encodeLog(log))).toEqual(log);
  });

  it('starts a new group only when the time stamp changes', () => {
    const log: LogEntry[] = [
      { at: 1, kind: 'joined', seat: 0 },
      { at: 2, kind: 'joined', seat: 1 },
      { at: 1, kind: 'left', seat: 0 },
    ];
    expect(encodeLog(log).map((g) => g.at)).toEqual([1, 2, 1]);
    expect(decodeLog(encodeLog(log))).toEqual(log);
  });

  it('round-trips the whole log of seeded games', () => {
    for (const players of [2, 4, 8]) {
      const views = replayViews(players * 13, players);
      const log = views.at(-1)!.log;
      expect(log.length).toBeGreaterThan(20);
      expect(decodeLog(encodeLog(log))).toEqual(log);
    }
  });
});
