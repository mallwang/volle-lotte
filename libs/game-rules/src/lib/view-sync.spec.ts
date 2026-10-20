import { applyAction, createGame } from './game.js';
import {
  LOG_CAP,
  type LogEntry,
  type GameChange,
  type GameStateView,
  type GameView,
} from './protocol.js';
import { scriptedRandomInt, seededRandomInt } from './rng.js';
import { replayViews } from './testing/replay.js';
import { defaultRules, type GameState } from './types.js';
import { applyChange, decodeView, diffView, encodeChange, encodeView } from './view-sync.js';
import { decodeLog, encodeLog } from './wire-log.js';

const rules = defaultRules();
const engineResult = {
  reason: 'targetScore' as const,
  winner: 0,
  ranking: [{ rank: 1, players: [0] }],
};
const rolls = (...faces: number[]) => scriptedRandomInt(faces.map((f) => f - 1));

const stateView = (state: GameState): GameStateView => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { deck, rules: _rules, ...rest } = state;
  return { ...rest, deckSize: deck.length };
};
const entry = (i: number) => ({ at: 1000 + i, kind: 'turn' as const, seat: i % 2 });

const seatsOf = (n: number): GameView['seats'] =>
  Array.from({ length: n }, (_, i) => ({
    state: 'human' as const,
    playerId: `p${i}`,
    nickname: `Player ${i}`,
    connected: true,
    ready: false,
  }));

const lobby = (): GameView => ({
  id: 'abc',
  name: 'Table',
  phase: 'lobby',
  rules,
  hostId: 'p0',
  you: { playerId: 'p0', seat: 0, timeoutWarning: false },
  round: 1,
  seats: seatsOf(3),
  fastComputerDice: false,
  computerSpeed: 3,
  showBustProbability: false,
  spectating: true,
  spectators: 0,
  paused: false,
  n: 0,
  logBase: 0,
  log: [entry(0)],
});

const running = (): GameView => {
  const game = createGame(['Player 0', 'Player 1', 'Player 2'], rules, seededRandomInt(5));
  return {
    ...lobby(),
    phase: 'running',
    game: stateView(game),
    preview: [],
    turnDeadline: { at: 5000, phase: 'draw' },
  };
};

/** The change as the server would send it: `n` one higher. */
const send = (prev: GameView, next: GameView): GameChange | 'snapshot' | null => {
  const parts = diffView(prev, next);
  return parts && parts !== 'snapshot' ? { n: prev.n + 1, ...encodeChange(parts) } : parts;
};
const sameAs = (view: GameView, n: number): GameView => ({ ...view, n });
const roundTrip = (prev: GameView, next: GameView) => {
  const change = send(prev, next);
  expect(change).not.toBeNull();
  expect(change).not.toBe('snapshot');
  expect(applyChange(prev, change as GameChange)).toEqual(sameAs(next, prev.n + 1));
  return change as GameChange;
};

describe('diffView and applyChange', () => {
  describe('round trip', () => {
    it('lobby: seat set, ready, rename, settings', () => {
      const base = lobby();
      const seat = roundTrip(base, {
        ...base,
        seats: base.seats.map((s, i) =>
          i === 1 ? { state: 'computer', name: 'Bot', difficulty: 'easy', risk: 'none' } : s,
        ),
      });
      expect(seat.seats).toEqual([[1, expect.objectContaining({ state: 'computer' })]]);
      const ready = roundTrip(base, {
        ...base,
        seats: base.seats.map((s, i) => (i === 0 ? { ...s, ready: true } : s)),
      });
      expect(Object.keys(ready)).toEqual(['n', 'seats']);
      const settings = roundTrip(base, { ...base, computerSpeed: 5, spectating: false });
      expect(settings.settings).toEqual({ computerSpeed: 5, spectating: false });
    });

    it('running: throw, select, bank, preview, timer, pause', () => {
      const a: GameState = {
        ...createGame(['Player 0', 'Player 1', 'Player 2'], rules, seededRandomInt(5)),
        deck: ['street', 'clover'],
      };
      const drawn = applyAction(a, { type: 'draw' }, rolls());
      const thrown =
        drawn.ok && applyAction(drawn.state, { type: 'throw' }, rolls(1, 2, 2, 3, 4, 6));
      if (!drawn.ok || !thrown || !thrown.ok) throw new Error('setup');
      const base = running();
      const afterThrow: GameView = {
        ...base,
        game: stateView(thrown.state),
        log: [...base.log, entry(1)],
        turnDeadline: { at: 9000, phase: 'select' },
      };
      const change = roundTrip(base, afterThrow);
      expect(decodeLog(change.log!)).toEqual([entry(1)]);
      expect(change.seats).toBeUndefined();
      const preview = roundTrip(afterThrow, { ...afterThrow, preview: [0, 2] });
      expect(Object.keys(preview)).toEqual(['n', 'preview']);
      const cleared = roundTrip(afterThrow, { ...afterThrow, turnDeadline: undefined });
      expect(cleared.turnDeadline).toBeNull();
      roundTrip(afterThrow, { ...afterThrow, paused: true });
      roundTrip(afterThrow, { ...afterThrow, you: { ...afterThrow.you, timeoutWarning: true } });
    });

    it('takeover by a computer, host change, spectator count', () => {
      const base = running();
      const takeover = roundTrip(base, {
        ...base,
        seats: base.seats.map((s, i) =>
          i === 2
            ? {
                state: 'computer',
                name: 'Bot',
                difficulty: 'medium',
                risk: 'medium',
                former: { nickname: 'Player 2' },
              }
            : s,
        ),
        log: [...base.log, { at: 2, kind: 'seatChanged', seat: 2 }],
      });
      expect(takeover.seats).toHaveLength(1);
      expect(roundTrip(base, { ...base, hostId: 'p1' }).hostId).toBe('p1');
      expect(roundTrip(base, { ...base, spectators: 2 })).toEqual({ n: 1, spectators: 2 });
    });

    it('finished, and the waiting-player view with rematch open and closed', () => {
      const base = running();
      const finished = roundTrip(base, { ...base, phase: 'finished', turnDeadline: undefined });
      expect(finished.phase).toBe('finished');
      const done: GameView = {
        ...base,
        phase: 'finished',
        turnDeadline: undefined,
        preview: undefined,
      };
      // a waiting player's view has no preview: the switch from the normal view is a snapshot
      expect(diffView({ ...done, preview: [] }, done)).toBe('snapshot');
      const waiting = roundTrip(done, {
        ...done,
        rematch: 'open',
        you: { ...done.you, reserved: 1 },
      }).rematch;
      expect(waiting).toBe('open');
      const open = { ...done, rematch: 'open' as const };
      expect(roundTrip(open, { ...open, rematch: 'closed' }).rematch).toBe('closed');
      expect(roundTrip(open, { ...done }).rematch).toBeNull();
    });

    it('a game that appears', () => {
      const base = lobby();
      const started = roundTrip(base, running());
      expect(started.game).toBeDefined();
      expect(started.preview).toEqual([]);
      expect(started.gameDiff).toBeUndefined();
    });

    it('a game that disappears', () => {
      const base = running();
      const { game: _game, ...gone } = base;
      expect(roundTrip(base, gone as GameView).game).toBeNull();
    });

    it('a running game sends a difference, never the whole game', () => {
      const base = running();
      const next = { ...base, game: { ...base.game!, current: 1 } };
      const change = roundTrip(base, next);
      expect(change.game).toBeUndefined();
      expect(change.gameDiff).toEqual({ current: 1 });
    });

    it('replays seeded full games of 2, 4 and 8 players step by step', () => {
      for (const players of [2, 4, 8]) {
        const views = replayViews(players * 11, players);
        expect(views.length).toBeGreaterThan(20);
        let have = views[0];
        for (const next of views.slice(1)) {
          const parts = diffView(have, next);
          expect(parts).not.toBe('snapshot');
          if (parts === null || parts === 'snapshot') continue;
          have = applyChange(have, { n: have.n + 1, ...encodeChange(parts) });
          expect(have).toEqual({ ...next, n: have.n });
        }
      }
    });
  });

  describe('partial you', () => {
    it('sends only the timeout warning flag, on and off', () => {
      const base = running();
      const warned = { ...base, you: { ...base.you, timeoutWarning: true } };
      expect(roundTrip(base, warned).you).toEqual({ timeoutWarning: true });
      expect(roundTrip(warned, base).you).toEqual({ timeoutWarning: false });
    });

    it('sends a changed own seat alone', () => {
      const base = running();
      expect(roundTrip(base, { ...base, you: { ...base.you, seat: 2 } }).you).toEqual({ seat: 2 });
    });

    it('sets and removes the reserved seat', () => {
      const base = running();
      const reserved = { ...base, you: { ...base.you, reserved: 1 } };
      expect(roundTrip(base, reserved).you).toEqual({ reserved: 1 });
      const removed = roundTrip(reserved, base).you;
      expect(removed).toEqual({ reserved: null });
      expect(applyChange(reserved, { n: 1, you: removed })).not.toHaveProperty('you.reserved');
    });
  });

  describe('turn deadline (rule D)', () => {
    const at = (view: GameView, patch: Partial<GameView>): GameView => ({ ...view, ...patch });
    const base = running();
    const current = (c: number) => ({ ...base.game!, current: c });

    it.each([
      [
        'the turn passes to another player',
        at(base, { game: current(1), turnDeadline: undefined }),
      ],
      [
        'the turn phase changes',
        at(base, {
          game: { ...base.game!, turn: { ...base.game!.turn!, phase: 'throw' } },
          turnDeadline: undefined,
        }),
      ],
      [
        'the game ends',
        at(base, {
          game: { ...base.game!, turn: null, result: engineResult },
          turnDeadline: undefined,
        }),
      ],
      ['the game disappears', at({ ...base }, { game: undefined, turnDeadline: undefined })],
      ['the host pauses', at(base, { paused: true, turnDeadline: undefined })],
    ])('is not sent as null when %s', (_name, next) => {
      const change = roundTrip(base, next);
      expect(change).not.toHaveProperty('turnDeadline');
      expect(applyChange(base, change).turnDeadline).toBeUndefined();
    });

    it('is sent once with the new value when the turn moves to a human', () => {
      const next = at(base, { game: current(1), turnDeadline: { at: 9000, phase: 'draw' } });
      expect(roundTrip(base, next).turnDeadline).toEqual({ at: 9000, phase: 'draw' });
    });

    it('is sent again when the same value would be dropped by the rule', () => {
      const next = at(base, { game: current(1) });
      expect(roundTrip(base, next).turnDeadline).toEqual(base.turnDeadline);
    });

    it('is still sent as null when only the timer is switched off', () => {
      const change = roundTrip(base, at(base, { turnDeadline: undefined }));
      expect(change.turnDeadline).toBeNull();
    });

    it('is kept when something else changes', () => {
      const change = roundTrip(base, at(base, { spectators: 3 }));
      expect(change).not.toHaveProperty('turnDeadline');
    });

    it('replays seeded games with a turn limit that restarts with each action', () => {
      for (const players of [2, 4, 8]) {
        const views = replayViews(players * 17, players, true);
        let have = views[0];
        for (const next of views.slice(1)) {
          const parts = diffView(have, next);
          if (parts === null || parts === 'snapshot') continue;
          have = applyChange(have, { n: have.n + 1, ...encodeChange(parts) });
          expect(have).toEqual({ ...next, n: have.n });
        }
      }
    });
  });

  describe('nothing to send', () => {
    it('an unchanged view gives null', () => {
      const base = running();
      expect(diffView(base, { ...base, seats: [...base.seats], log: [...base.log] })).toBeNull();
      expect(diffView(base, structuredClone(base))).toBeNull();
    });

    it('does not look at n', () => {
      const base = running();
      expect(diffView(base, { ...base, n: 99 })).toBeNull();
    });
  });

  describe('structural differences give a snapshot', () => {
    const base = running();
    it.each([
      ['round', { ...base, round: 2 }],
      ['id', { ...base, id: 'other' }],
      ['name', { ...base, name: 'Renamed' }],
      ['rules', { ...base, rules: { ...rules, targetScore: 9999 } }],
      ['seat count', { ...base, seats: base.seats.slice(1) }],
      ['player count', { ...base, game: { ...base.game!, players: base.game!.players.slice(1) } }],
      ['spectator flag', { ...base, you: { ...base.you, spectator: true } }],
      ['shorter log', { ...base, log: [] }],
      ['log base backwards', { ...base, logBase: -1 }],
      ['preview gone', { ...base, preview: undefined }],
      ['more new entries than the log holds', { ...base, logBase: 1, log: [] }],
    ])('%s', (_name, next) => {
      expect(diffView(base, next as GameView)).toBe('snapshot');
    });

    it('a log base that moved without entries added', () => {
      expect(diffView(base, { ...base, logBase: base.logBase + 2 })).toBe('snapshot');
    });
  });

  describe('log', () => {
    it('appends the entries between the two ends', () => {
      const base = running();
      const next = { ...base, log: [...base.log, entry(1), entry(2)] };
      const change = roundTrip(base, next);
      expect(decodeLog(change.log!)).toEqual([entry(1), entry(2)]);
    });

    it('trims to LOG_CAP and raises logBase, like the room', () => {
      const full = Array.from({ length: LOG_CAP }, (_, i) => entry(i));
      const base = { ...running(), log: full, logBase: 10 };
      const added = [entry(LOG_CAP), entry(LOG_CAP + 1), entry(LOG_CAP + 2)];
      const next = { ...base, logBase: 13, log: [...full, ...added].slice(3) };
      const change = roundTrip(base, next);
      expect(decodeLog(change.log!)).toEqual(added);
      const applied = applyChange(base, change);
      expect(applied.logBase).toBe(13);
      expect(applied.log).toHaveLength(LOG_CAP);
    });

    it('a snapshot keeps its log through encodeView and decodeView', () => {
      const views = replayViews(21, 4);
      const view = views.at(-1)!;
      expect(view.log.length).toBeGreaterThan(20);
      expect(decodeView(encodeView(view))).toEqual(view);
      expect(encodeView(view).log.length).toBeLessThanOrEqual(view.log.length);
      expect(decodeView(encodeView(running()))).toEqual(running());
    });

    it('trims the same for a client who joined late and one who applied every change', () => {
      const room = { ...running(), log: [] as LogEntry[], logBase: 0 };
      let early = room;
      const rng = seededRandomInt(8);
      for (let i = 0; i < LOG_CAP + 120; i++) {
        const added = Array.from({ length: 1 + rng(3) }, (_, k) => ({
          ...entry(i * 3 + k),
          at: 1000 + i,
        }));
        const log = [...room.log, ...added];
        const drop = Math.max(0, log.length - LOG_CAP);
        const next = { ...room, log: log.slice(drop), logBase: room.logBase + drop };
        const parts = diffView(room, next);
        if (parts === null || parts === 'snapshot') throw new Error('expected a change');
        early = applyChange(early, { n: early.n + 1, ...encodeChange(parts) });
        Object.assign(room, next);
      }
      const late = decodeView(encodeView(room));
      expect(early.log).toHaveLength(LOG_CAP);
      expect({ log: early.log, logBase: early.logBase }).toEqual({
        log: late.log,
        logBase: late.logBase,
      });
    });

    it('does not modify the given view', () => {
      const base = running();
      const frozen = structuredClone(base);
      applyChange(base, {
        n: 1,
        log: encodeLog([entry(5)]),
        seats: [[0, { state: 'open' }]],
        settings: { computerSpeed: 1 },
        game: null,
        turnDeadline: null,
        rematch: null,
        preview: [1],
      });
      expect(base).toEqual(frozen);
    });
  });

  it('knows every field of a view (add new fields to diffView and applyChange)', () => {
    const fields = Object.keys({ ...running(), rematch: 'open' }).sort();
    expect(fields).toEqual(
      [
        'id',
        'name',
        'phase',
        'rules',
        'hostId',
        'you',
        'round',
        'rematch',
        'seats',
        'game',
        'preview',
        'turnDeadline',
        'fastComputerDice',
        'computerSpeed',
        'showBustProbability',
        'spectating',
        'spectators',
        'paused',
        'n',
        'logBase',
        'log',
      ].sort(),
    );
  });

  it('round-trips 200 random mutations', () => {
    const rng = seededRandomInt(42);
    let view = running();
    let snapshots = 0;
    for (let step = 0; step < 200; step++) {
      const next = mutated(view, rng, step);
      const parts = diffView(view, next);
      if (parts === 'snapshot') {
        snapshots++;
        view = { ...next, n: view.n + 1 };
      } else if (parts === null) {
        expect(view).toEqual({ ...next, n: view.n });
      } else {
        const change = { n: view.n + 1, ...encodeChange(parts) };
        view = applyChange(view, change);
        expect(view).toEqual({ ...next, n: change.n });
      }
    }
    expect(snapshots).toBeLessThan(150);
  });
});

type Rng = (n: number) => number;
const pick = <T>(rng: Rng, items: readonly T[]): T => items[rng(items.length)];
const engineView = stateView(
  createGame(['Player 0', 'Player 1', 'Player 2'], rules, seededRandomInt(9)),
);

/** One random edit of one group of the view, like the room would make. */
const edits: ((next: GameView, rng: Rng, step: number) => void)[] = [
  (next, rng) => {
    next.seats[rng(3)] = pick(rng, [
      { state: 'open' },
      { state: 'locked' },
      { state: 'computer', name: `Bot ${rng(9)}`, difficulty: 'hard', risk: 'random' },
      {
        state: 'human',
        playerId: 'px',
        nickname: 'X',
        connected: rng(2) === 0,
        ready: rng(2) === 0,
      },
    ] as GameView['seats']);
  },
  (next, rng) => {
    next.game = pick(rng, [undefined, engineView, { ...engineView, current: rng(3) }]);
    if (next.game) next.preview ??= [];
    else next.preview = undefined;
  },
  (next, rng) => {
    if (next.game) next.preview = Array.from({ length: rng(4) }, () => rng(6));
  },
  (next, rng) => {
    next.turnDeadline = pick(rng, [
      undefined,
      { at: rng(1e6), phase: pick(rng, ['draw', 'throw', 'select', 'decide'] as const) },
    ]);
  },
  (next, rng) => {
    next.phase = pick(rng, ['lobby', 'running', 'finished'] as const);
  },
  (next, rng) => {
    next.rematch = pick(rng, [undefined, 'open', 'closed'] as const);
  },
  (next, rng) => {
    next.hostId = `p${rng(3)}`;
    next.you = { ...next.you, timeoutWarning: rng(2) === 0, reserved: pick(rng, [undefined, 1]) };
  },
  (next, rng) => {
    next.fastComputerDice = rng(2) === 0;
    next.computerSpeed = 1 + rng(5);
    next.showBustProbability = rng(2) === 0;
    next.spectating = rng(2) === 0;
  },
  (next, rng) => {
    next.spectators = rng(5);
    next.paused = rng(2) === 0;
  },
  (next, rng, step) => {
    for (let i = rng(4); i > 0; i--) next.log.push(entry(step * 10 + i));
  },
  (next, rng) => {
    next.round = rng(10) === 0 ? next.round + 1 : next.round;
  },
];

/** A copy of the view with 1 to 3 random edits; the log is capped like the room's. */
function mutated(view: GameView, rng: Rng, step: number): GameView {
  const next = structuredClone(view);
  for (let k = 0; k < 1 + rng(3); k++) edits[rng(edits.length)](next, rng, step);
  // reach the cap now and then
  if (step === 50) for (let i = 0; i < LOG_CAP; i++) next.log.push(entry(i));
  const over = Math.max(0, next.log.length - LOG_CAP);
  next.log.splice(0, over);
  next.logBase += over;
  return next;
}
