import { ENGLISH_ADJECTIVES, GERMAN_ADJECTIVES } from 'computer-names';
import { DEFAULT_SPEED, defaultRules, pacing, seededRandomInt, type UiLanguage } from 'game-rules';
import { GameRoom, GRACE_MS, MAX_TIMEOUTS, TURN_LIMIT_MS } from './game-room';
import { toView } from './view';

const make = (seatCount = 3, language: UiLanguage = 'en') => {
  const changes: number[] = [];
  const room = new GameRoom({
    id: 'g1',
    name: 'Test',
    passwordHash: 'secret-hash',
    rules: defaultRules(),
    seatCount,
    host: { playerId: 'h', nickname: 'Host', language },
    rng: seededRandomInt(1),
    nameRng: seededRandomInt(2),
    graceMs: 1000,
    onChange: (e) => changes.push(e.length),
  });
  return { room, changes };
};

const started = () => {
  const { room } = make();
  room.join('p', 'Pia');
  room.setReady('h', true);
  room.setReady('p', true);
  expect(room.start('h')).toEqual({ ok: true });
  return room;
};

describe('GameRoom lobby', () => {
  it('seats the host, locks seats beyond the count and joins by nickname', () => {
    const { room } = make();
    expect(room.seats.map((s) => s.state)).toEqual([
      'human',
      'open',
      'open',
      ...Array(5).fill('locked'),
    ]);
    expect(room.join('p', 'host')).toMatchObject({ ok: false, reason: 'nicknameTaken' });
    expect(room.join('p', 'Pia', 0)).toMatchObject({ ok: false, reason: 'seatNotFree' });
    expect(room.join('p', 'Pia')).toEqual({ ok: true, seat: 1 });
    expect(room.join('q', 'Quin')).toEqual({ ok: true, seat: 2 });
    expect(room.join('r', 'Rob')).toMatchObject({ reason: 'gameFull' });
  });

  it('keeps skill and risk of a computer seat, risk defaults to medium', () => {
    const { room } = make(4);
    expect(room.setSeat('h', 2, 'computer', 'hard', 'none')).toMatchObject({ ok: true });
    expect(room.seats[2]).toMatchObject({ state: 'computer', difficulty: 'hard', risk: 'none' });
    expect(room.setSeat('h', 3, 'computer')).toMatchObject({ ok: true });
    expect(room.seats[3]).toMatchObject({
      state: 'computer',
      difficulty: 'medium',
      risk: 'medium',
    });
    expect(toView(room, 'h').seats[2]).toEqual({
      state: 'computer',
      name: (room.seats[2] as { name: string }).name,
      difficulty: 'hard',
      risk: 'none',
    });
  });

  it('resets readiness on seat changes and guards setSeat', () => {
    const { room } = make();
    room.join('p', 'Pia');
    room.setReady('p', true);
    expect(room.setSeat('p', 2, 'locked')).toMatchObject({ reason: 'notHost' });
    expect(room.setSeat('h', 1, 'locked')).toMatchObject({ reason: 'seatOccupied' });
    expect(room.setSeat('h', 0, 'computer')).toMatchObject({ reason: 'seatOccupied' });
    expect(room.setSeat('h', 2, 'locked')).toMatchObject({ ok: true });
    expect(room.humans().every((h) => !h.ready)).toBe(true);
    expect(room.setSeat('h', 1, 'computer', 'hard')).toEqual({ ok: true, removed: 'p' });
  });

  it('starts only with two seats and everybody ready', () => {
    const { room } = make();
    expect(room.start('h')).toMatchObject({ reason: 'notEnoughPlayers' });
    room.join('p', 'Pia');
    expect(room.start('p')).toMatchObject({ reason: 'notHost' });
    expect(room.start('h')).toMatchObject({ reason: 'notReady' });
  });
});

describe('GameRoom play', () => {
  it('only the current player acts', () => {
    const room = started();
    const [cur, other] = room.game?.current === 0 ? ['h', 'p'] : ['p', 'h'];
    expect(room.act(other, { type: 'draw' })).toMatchObject({ reason: 'notYourTurn' });
    expect(room.act(cur, { type: 'draw' })).toEqual({ ok: true });
    expect(room.act(cur, { type: 'bank' })).toMatchObject({ ok: false });
  });

  it("shares the active player's dice preview and clears it on the next action", () => {
    const room = started();
    let [cur, other] = ['h', 'p'];
    // Play until a throw leaves dice to select (busts and stop cards pass the turn).
    for (let i = 0; i < 50 && room.game?.turn?.phase !== 'select'; i++) {
      [cur, other] = room.game?.current === 0 ? ['h', 'p'] : ['p', 'h'];
      room.act(cur, { type: room.game?.turn?.phase === 'draw' ? 'draw' : 'throw' });
    }
    expect(room.game?.turn?.phase).toBe('select');
    expect(room.setPreview(other, [0])).toMatchObject({ reason: 'notYourTurn' });
    expect(room.setPreview(cur, [0, 0])).toMatchObject({ reason: 'invalidRequest' });
    expect(room.setPreview(cur, [99])).toMatchObject({ reason: 'invalidRequest' });
    expect(room.setPreview(cur, [0])).toEqual({ ok: true });
    expect(toView(room, other).preview).toEqual([0]);
    room.act(cur, { type: 'select', dice: [0] });
    expect(toView(room, other).preview).toEqual([]);
  });

  it('views hide the deck and the hash', () => {
    const room = started();
    const json = JSON.stringify(toView(room, 'h'));
    expect(json).not.toContain('secret-hash');
    expect(toView(room, 'h').game).not.toHaveProperty('deck');
    expect(toView(room, 'h').game?.deckSize).toBeGreaterThan(0);
  });
});

describe('GameRoom leaving', () => {
  it('a leaver in a running game is replaced by a random computer that remembers them', () => {
    const room = started();
    expect(room.leave('p')).toEqual({ ok: true, empty: false });
    const seat = room.seats[1];
    expect(seat).toMatchObject({
      state: 'computer',
      difficulty: 'random',
      risk: 'random',
      former: { playerId: 'p', nickname: 'Pia' },
    });
    expect(room.log.at(-1)).toMatchObject({ kind: 'replaced', seat: 1, data: 'left' });
    expect(toView(room, 'h').seats[1]).toEqual({
      state: 'computer',
      name: (seat as { name: string }).name,
      difficulty: 'random',
      risk: 'random',
      former: { nickname: 'Pia' },
    });
    expect(room.leave('h')).toMatchObject({ empty: true });
    room.dispose();
  });
});

describe('GameRoom rejoin', () => {
  it('lets only the former player take their seat back, keeping the score', () => {
    const room = started();
    room.leave('p');
    expect(room.summary('p').rejoinable).toBe(true);
    expect(room.summary('h').rejoinable).toBe(false);
    expect(room.rejoin('x')).toMatchObject({ reason: 'notRejoinable' });
    expect(room.rejoin('h')).toMatchObject({ reason: 'alreadyInGame' });
    const before = room.game?.players[1].score;
    expect(room.rejoin('p')).toEqual({ ok: true, seat: 1 });
    expect(room.seats[1]).toMatchObject({ state: 'human', playerId: 'p', nickname: 'Pia' });
    expect(room.game?.players[1].score).toBe(before);
    expect(room.log.at(-1)).toMatchObject({ kind: 'rejoined', seat: 1 });
    expect(room.summary('p').rejoinable).toBe(false);
    room.dispose();
  });

  it('keeps the current host when the old host comes back', () => {
    const room = started();
    room.leave('h');
    expect(room.hostId).toBe('p');
    expect(room.rejoin('h')).toEqual({ ok: true, seat: 0 });
    expect(room.hostId).toBe('p');
    expect(room.summary().host).toBe('Pia');
    room.dispose();
  });

  it('makes the first player back the host once only computers are left', () => {
    const room = started();
    room.leave('h');
    room.leave('p');
    expect(room.hostId).toBe('p');
    expect(room.summary('x').host).toBe('');
    expect(room.rejoin('h')).toEqual({ ok: true, seat: 0 });
    expect(room.hostId).toBe('h');
    expect(room.log.at(-1)).toMatchObject({ kind: 'hostChanged', seat: 0 });
    expect(room.summary().host).toBe('Host');
    expect(room.rejoin('p')).toEqual({ ok: true, seat: 1 });
    expect(room.hostId).toBe('h');
    room.dispose();
  });

  it('gives the host back to the last host who returns first', () => {
    const room = started();
    room.leave('h');
    room.leave('p');
    expect(room.rejoin('p')).toEqual({ ok: true, seat: 1 });
    expect(room.hostId).toBe('p');
    expect(room.log.at(-1)).not.toMatchObject({ kind: 'hostChanged' });
    room.dispose();
  });

  it('lets only the last host end a game without humans', () => {
    const room = started();
    expect(room.canEnd('p')).toBe(false);
    room.leave('h');
    expect(room.canEnd('p')).toBe(false);
    room.leave('p');
    expect(room.canEnd('p')).toBe(true);
    expect(room.summary('p').closable).toBe(true);
    expect(room.canEnd('h')).toBe(false);
    expect(room.summary('h').closable).toBe(false);
    expect(room.canEnd(undefined)).toBe(false);
    room.rejoin('h');
    expect(room.canEnd('p')).toBe(false);
    expect(room.summary('p').closable).toBe(false);
    room.dispose();
  });

  it('rejects banned players and lobby games', () => {
    const { room } = make();
    room.join('p', 'Pia');
    expect(room.rejoin('p')).toMatchObject({ reason: 'alreadyInGame' });
    room.banned.add('b');
    expect(room.rejoin('b')).toMatchObject({ reason: 'banned' });
    room.leave('p');
    expect(room.rejoin('p')).toMatchObject({ reason: 'notRejoinable' });
  });
});

describe('GameRoom connection', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('frees a lobby seat after the grace period and hands over host', () => {
    const { room } = make();
    room.join('p', 'Pia');
    room.setConnected('h', false);
    jest.advanceTimersByTime(1000);
    expect(room.seats[0].state).toBe('open');
    expect(room.hostId).toBe('p');
  });

  it('reconnect within grace keeps the seat', () => {
    const { room } = make();
    room.setConnected('h', false);
    jest.advanceTimersByTime(500);
    room.setConnected('h', true);
    jest.advanceTimersByTime(5000);
    expect(room.seats[0].state).toBe('human');
  });

  it('uses a 30 s grace period', () => {
    expect(GRACE_MS).toBe(30_000);
  });

  it('hands a disconnected seat in a running game to a computer after the grace period', () => {
    const room = started();
    room.setConnected('p', false);
    jest.advanceTimersByTime(999);
    expect(room.seats[1].state).toBe('human');
    jest.advanceTimersByTime(1);
    expect(room.seats[1]).toMatchObject({ state: 'computer', former: { playerId: 'p' } });
    expect(room.log.at(-1)).toMatchObject({ kind: 'replaced', seat: 1, data: 'disconnected' });
    room.dispose();
  });

  it("the computer plays the replaced seat's pending turn", () => {
    const room = started();
    // hand the turn to Pia by banking/ending the host's turn is engine dependent, so drive until it is hers
    for (let i = 0; i < 50 && room.game?.current !== 1; i++) {
      const phase = room.game?.turn?.phase;
      room.act(
        'h',
        phase === 'select'
          ? { type: 'select', dice: [0] }
          : { type: phase === 'decide' ? 'bank' : (phase ?? 'throw') },
      );
    }
    expect(room.game?.current).toBe(1);
    room.leave('p');
    const n = room.log.length;
    jest.advanceTimersByTime(10_000);
    expect(room.log.length).toBeGreaterThan(n);
    room.dispose();
  });
});

describe('GameRoom settings and computer pacing', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('lets only the host share bust probability in lobby and running games, not after the end', () => {
    const { room, changes } = make();
    expect(toView(room, 'h').showBustProbability).toBe(false);
    expect(room.setSettings('p', { showBustProbability: true })).toMatchObject({
      reason: 'notHost',
    });
    const n = changes.length;
    expect(room.setSettings('h', { showBustProbability: true })).toEqual({
      ok: true,
      changes: [{ setting: 'showBustProbability', value: true }],
      evicted: [],
    });
    expect(changes).toHaveLength(n + 1);
    expect(toView(room, 'h').showBustProbability).toBe(true);
    expect(room.setSettings('h', { showBustProbability: true })).toEqual({
      ok: true,
      changes: [],
      evicted: [],
    });
    expect(changes).toHaveLength(n + 1);
    room.setSeat('h', 1, 'computer');
    room.setReady('h', true);
    room.start('h');
    expect(room.setSettings('h', { showBustProbability: false })).toEqual({
      ok: true,
      changes: [{ setting: 'showBustProbability', value: false }],
      evicted: [],
    });
    room.phase = 'finished';
    expect(room.setSettings('h', { showBustProbability: true })).toMatchObject({
      reason: 'notInGame',
    });
    room.dispose();
  });

  it('lets only the host change fast computer dice, and not after the game ended', () => {
    const { room, changes } = make();
    room.join('p', 'Pia');
    expect(room.setSettings('p', { fastComputerDice: true })).toMatchObject({ reason: 'notHost' });
    expect(room.fastComputerDice).toBe(false);
    const before = changes.length;
    expect(room.setSettings('h', { fastComputerDice: true })).toEqual({
      ok: true,
      changes: [{ setting: 'fastComputerDice', value: true }],
      evicted: [],
    });
    expect(room.fastComputerDice).toBe(true);
    expect(changes).toHaveLength(before + 1);
    expect(toView(room, 'p').fastComputerDice).toBe(true);
    room.phase = 'finished';
    expect(room.setSettings('h', { fastComputerDice: false })).toMatchObject({
      reason: 'notInGame',
    });
  });

  it('validates the computer speed, allows it in the lobby and reports real changes only', () => {
    const { room, changes } = make();
    room.join('p', 'Pia');
    expect(room.computerSpeed).toBe(DEFAULT_SPEED);
    expect(toView(room, 'p').computerSpeed).toBe(3);
    expect(room.setSettings('p', { computerSpeed: 4 })).toMatchObject({ reason: 'notHost' });
    for (const bad of [0, 6, 2.5, '3' as unknown as number])
      expect(room.setSettings('h', { computerSpeed: bad })).toMatchObject({
        reason: 'invalidRequest',
      });
    const before = changes.length;
    expect(room.setSettings('h', { computerSpeed: 5 })).toEqual({
      ok: true,
      changes: [{ setting: 'computerSpeed', value: 5 }],
      evicted: [],
    });
    expect(toView(room, 'p').computerSpeed).toBe(5);
    expect(changes).toHaveLength(before + 1);
    expect(room.setSettings('h', { computerSpeed: 5 })).toEqual({
      ok: true,
      changes: [],
      evicted: [],
    });
    expect(changes).toHaveLength(before + 1);
    room.phase = 'finished';
    expect(room.setSettings('h', { computerSpeed: 1 })).toMatchObject({ reason: 'notInGame' });
  });

  it('pauses and resumes computer play, host only', () => {
    const { room } = untilComputer(false);
    const before = room.log.length;
    expect(room.setPaused('x', true)).toMatchObject({ reason: 'notHost' });
    expect(room.setPaused('h', true)).toEqual({ ok: true });
    expect(toView(room, 'h').paused).toBe(true);
    jest.advanceTimersByTime(60_000);
    expect(room.log).toHaveLength(before);
    expect(room.setPaused('h', false)).toEqual({ ok: true });
    jest.advanceTimersByTime(60_000);
    expect(room.log.length).toBeGreaterThan(before);
    room.dispose();
  });

  /** Host plays until a computer is up; returns the room and whether the last action was a throw. */
  const untilComputer = (fast: boolean, speed = DEFAULT_SPEED) => {
    const { room } = make(2);
    room.setSeat('h', 1, 'computer', 'easy');
    room.setSettings('h', { computerSpeed: speed });
    room.setSettings('h', { fastComputerDice: fast });
    room.setReady('h', true);
    expect(room.start('h')).toEqual({ ok: true });
    const move = { draw: 'draw', decide: 'bank' } as Record<string, 'draw' | 'bank'>;
    // seats are in turn order, so engine player 1 is the computer
    for (let i = 0; i < 200 && room.game?.current === 0; i++) {
      const phase = room.game?.turn?.phase ?? '';
      room.act(
        'h',
        phase === 'select' ? { type: 'select', dice: [0] } : { type: move[phase] ?? 'throw' },
      );
    }
    const last = room.log
      .slice(-2)
      .map((e) => JSON.stringify(e))
      .join();
    // a turn that ended (bust, bank) is shown as a notice before the next player moves
    return { room, thrown: last.includes('"thrown"'), ended: last.includes('"turnEnded"') };
  };

  const delayAt = (speed: number, thrown: boolean, ended: boolean) => {
    const p = pacing(speed);
    return (thrown ? 3000 + p.afterRollMs : p.pauseMs) + (ended ? p.noticeMs : 0);
  };

  it.each([DEFAULT_SPEED, 2])(
    'waits for the dice to stop before the computer acts, else the pause (speed %i)',
    (speed) => {
      const { room, thrown, ended } = untilComputer(false, speed);
      const n = room.log.length;
      const delay = delayAt(speed, thrown, ended);
      jest.advanceTimersByTime(delay - 1);
      expect(room.log).toHaveLength(n);
      jest.advanceTimersByTime(1);
      expect(room.log.length).toBeGreaterThan(n);
      room.dispose();
    },
  );

  it('speed 2 keeps the legacy pacing: 2 s pause, 3.25 s margin, 6 s notice', () => {
    expect(pacing(2)).toEqual({ pauseMs: 2000, afterRollMs: 3250, noticeMs: 6000 });
  });

  it('shows a computer pick as preview before applying it', () => {
    const { room } = untilComputer(false);
    // step the computer until its pick is shown but not yet applied
    for (let i = 0; i < 2000 && room.preview.length === 0; i++) jest.advanceTimersByTime(100);
    expect(room.preview.length).toBeGreaterThan(0);
    expect(room.game?.turn?.phase).toBe('select');
    jest.advanceTimersByTime(pacing(DEFAULT_SPEED).pauseMs);
    expect(room.preview).toEqual([]);
    room.dispose();
  });

  it('a speed change re-arms the pending computer step once, earlier when faster', () => {
    const { room, thrown, ended } = untilComputer(false, 1);
    const n = room.log.length;
    const slow = delayAt(1, thrown, ended);
    jest.advanceTimersByTime(1000);
    room.setSettings('h', { computerSpeed: 5 });
    const fast = delayAt(5, thrown, ended);
    expect(fast).toBeLessThan(slow - 1000);
    jest.advanceTimersByTime(Math.max(0, fast - 1000) - 1);
    expect(room.log).toHaveLength(n);
    jest.advanceTimersByTime(1);
    const after = room.log.length;
    expect(after).toBeGreaterThan(n);
    // the old timer is gone: nothing runs a second time at the old deadline
    jest.advanceTimersByTime(slow);
    expect(room.log.length).toBeGreaterThanOrEqual(after);
    room.dispose();
  });

  it('a speed change during the pick highlight neither skips nor repeats the pick', () => {
    const { room } = untilComputer(false, 1);
    for (let i = 0; i < 4000 && room.preview.length === 0; i++) jest.advanceTimersByTime(100);
    expect(room.preview.length).toBeGreaterThan(0);
    const picked = room.log.filter((e) => JSON.stringify(e).includes('"selected"')).length;
    room.setSettings('h', { computerSpeed: 5 });
    expect(room.preview.length).toBeGreaterThan(0);
    jest.advanceTimersByTime(pacing(5).pauseMs);
    expect(room.preview).toEqual([]);
    const now = room.log.filter((e) => JSON.stringify(e).includes('"selected"')).length;
    expect(now).toBe(picked + 1);
    room.dispose();
  });

  it('the human limit starts after the scaled notice plus the fixed dice margin (FR-013)', () => {
    const { room } = make(2);
    room.setSeat('h', 1, 'computer', 'easy');
    room.setSettings('h', { computerSpeed: 5 });
    room.setReady('h', true);
    room.start('h');
    if (room.game?.current !== 0) {
      room.dispose();
      return;
    }
    expect(room.turnDeadline?.at).toBe(Date.now() + TURN_LIMIT_MS.draw);
    room.dispose();
  });
});

type Human = Extract<GameRoom['seats'][number], { state: 'human' }>;

describe('GameRoom turn timer', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('auto-plays the idle human, counts strikes and warns before the last one', () => {
    const room = started();
    const first = room.seats[room.game?.current === 0 ? 0 : 1] as Human;
    expect(room.turnDeadline).toMatchObject({ phase: 'draw' });
    jest.advanceTimersByTime(TURN_LIMIT_MS.draw - 1);
    expect(room.log.some((e) => e.kind === 'timedOut')).toBe(false);
    jest.advanceTimersByTime(1);
    expect(room.log.find((e) => e.kind === 'timedOut')).toMatchObject({ data: 'skip' });
    expect(first.timeouts).toBe(1);
    room.dispose();
  });

  it('gives the idle human the full limit again after a pause', () => {
    const room = started();
    const first = room.seats[room.game?.current === 0 ? 0 : 1] as Human;
    jest.advanceTimersByTime(TURN_LIMIT_MS.draw - 1000);
    expect(room.setPaused('h', true)).toEqual({ ok: true });
    expect(room.turnDeadline).toBeUndefined();
    jest.advanceTimersByTime(60_000);
    expect(room.setPaused('h', false)).toEqual({ ok: true });
    expect(room.turnDeadline?.at).toBe(Date.now() + TURN_LIMIT_MS.draw);
    jest.advanceTimersByTime(TURN_LIMIT_MS.draw - 1);
    expect(first.timeouts).toBe(0);
    jest.advanceTimersByTime(1);
    expect(first.timeouts).toBe(1);
    room.dispose();
  });

  it('an own action resets the strikes and the 3rd timeout replaces the seat', () => {
    const room = started();
    const current = () => room.seats[room.game?.current === 0 ? 0 : 1] as Human;
    const first = current();
    jest.advanceTimersByTime(TURN_LIMIT_MS.draw);
    expect(first.timeouts).toBe(1);
    // whoever is up now plays: their strikes reset
    const up = current();
    room.act(up.playerId, { type: room.game?.turn?.phase === 'draw' ? 'draw' : 'throw' });
    expect(up.timeouts).toBe(0);
    // idle until a seat is handed over; every limit passes without input
    for (let i = 0; i < 200 && !room.log.some((e) => e.kind === 'replaced'); i++)
      jest.advanceTimersByTime(1000);
    const replaced = room.log.find((e) => e.kind === 'replaced');
    expect(replaced).toMatchObject({ data: 'timeouts' });
    expect(room.log.filter((e) => e.kind === 'timedOut' && e.seat === replaced?.seat)).toHaveLength(
      MAX_TIMEOUTS,
    );
    expect(room.seats[replaced?.seat ?? 0]).toMatchObject({ state: 'computer' });
    room.dispose();
  });

  it('does not send a deadline while a computer is up', () => {
    const { room } = make(2);
    room.setSeat('h', 1, 'computer', 'easy');
    room.setReady('h', true);
    room.start('h');
    const humanFirst = room.game?.current === 0;
    expect(room.turnDeadline !== undefined).toBe(humanFirst);
    room.dispose();
  });
});

const nameOf = (room: GameRoom, seat: number) => (room.seats[seat] as { name: string }).name;
const engineNames = (room: GameRoom) => room.game?.players.map((p) => p.name);

describe('computer names', () => {
  it('gives each lobby computer a distinct two-word English name', () => {
    const { room } = make(8);
    for (let i = 1; i < 8; i++) room.setSeat('h', i, 'computer');
    const names = room.seats.slice(1).map((_, i) => nameOf(room, i + 1));
    expect(new Set(names.map((n) => n.toLowerCase())).size).toBe(7);
    for (const name of names) {
      const [adjective, noun] = name.split(' ');
      expect(ENGLISH_ADJECTIVES).toContain(adjective);
      expect(noun).toBeTruthy();
      expect(name).not.toMatch(/^Computer \d/);
    }
  });

  it("uses the host's German UI language", () => {
    const { room } = make(3, 'de');
    room.setSeat('h', 1, 'computer');
    const [adjective] = nameOf(room, 1).split(' ');
    expect(GERMAN_ADJECTIVES.flatMap((a) => Object.values(a))).toContain(adjective);
  });

  it('keeps the name when only skill changes and makes a fresh one after reopening', () => {
    const { room } = make(3);
    room.setSeat('h', 1, 'computer', 'easy');
    const first = nameOf(room, 1);
    room.setSeat('h', 1, 'computer', 'hard');
    expect(nameOf(room, 1)).toBe(first);
    room.setSeat('h', 1, 'open');
    room.setSeat('h', 1, 'computer');
    expect(nameOf(room, 1)).not.toBe(first);
  });

  it('never reuses a name taken by a player or another computer, ignoring case', () => {
    const forced = new GameRoom({
      id: 'x',
      name: 'x',
      passwordHash: '',
      rules: defaultRules(),
      seatCount: 4,
      host: { playerId: 'h', nickname: 'Host' },
      nameRng: () => 0,
    });
    forced.setSeat('h', 1, 'computer');
    expect(nameOf(forced, 1)).toBe('Brave Badger');
    expect(forced.join('p', 'brave badger')).toMatchObject({ ok: false, reason: 'nicknameTaken' });
    forced.setSeat('h', 2, 'computer');
    expect(nameOf(forced, 2).toLowerCase()).not.toBe('brave badger');
  });

  it('uses the computer names for the engine players and shows them in every view', () => {
    const { room } = make(3);
    room.join('p', 'Pia');
    room.setSeat('h', 2, 'computer');
    room.setSeat('h', 2, 'open');
    room.setSeat('h', 2, 'computer');
    room.setReady('h', true);
    room.setReady('p', true);
    expect(room.start('h')).toEqual({ ok: true });
    expect(engineNames(room)).toEqual(['Host', 'Pia', nameOf(room, 2)]);
    expect(toView(room, 'p').seats[2].name).toBe(nameOf(room, 2));
    room.dispose();
  });
});

describe('computer rename', () => {
  const running = () => {
    const { room } = make(4);
    room.join('p', 'Pia');
    room.setSeat('h', 2, 'computer');
    room.setSeat('h', 3, 'computer');
    room.setReady('h', true);
    room.setReady('p', true);
    return room;
  };

  it('renames in the lobby and logs the old name', () => {
    const room = running();
    const old = nameOf(room, 2);
    expect(room.renameComputer('h', 2, '  Rex  ')).toEqual({ ok: true });
    expect(nameOf(room, 2)).toBe('Rex');
    expect(toView(room, 'p').seats[2].name).toBe('Rex');
    expect(room.log.at(-1)).toMatchObject({ kind: 'renamed', seat: 2, data: old });
  });

  it('renames the engine player of a running game without touching state', () => {
    const room = running();
    room.start('h');
    const before = room.game;
    expect(room.renameComputer('h', 3, 'Rex')).toEqual({ ok: true });
    expect(engineNames(room)).toEqual(['Host', 'Pia', nameOf(room, 2), 'Rex']);
    expect(room.game).toMatchObject({ current: before?.current, deck: before?.deck });
    expect(room.game?.players.map((p) => p.score)).toEqual(before?.players.map((p) => p.score));
    room.dispose();
  });

  it('rejects non-hosts, non-computers, bad and duplicate names without changes', () => {
    const room = running();
    const names = [nameOf(room, 2), nameOf(room, 3)];
    const logged = room.log.length;
    expect(room.renameComputer('p', 2, 'Rex')).toMatchObject({ reason: 'notHost' });
    expect(room.renameComputer('h', 1, 'Rex')).toMatchObject({ reason: 'invalidRequest' });
    expect(room.renameComputer('h', 0, 'Rex')).toMatchObject({ reason: 'invalidRequest' });
    expect(room.renameComputer('h', 7, 'Rex')).toMatchObject({ reason: 'invalidRequest' });
    expect(room.renameComputer('h', 2, '   ')).toMatchObject({ reason: 'invalidNickname' });
    expect(room.renameComputer('h', 2, 'x'.repeat(21))).toMatchObject({
      reason: 'invalidNickname',
    });
    expect(room.renameComputer('h', 2, 'Bad<>')).toMatchObject({ reason: 'invalidNickname' });
    expect(room.renameComputer('h', 2, 42)).toMatchObject({ reason: 'invalidNickname' });
    expect(room.renameComputer('h', 2, 'pia')).toMatchObject({ reason: 'nicknameTaken' });
    expect(room.renameComputer('h', 2, nameOf(room, 3).toUpperCase())).toMatchObject({
      reason: 'nicknameTaken',
    });
    expect([nameOf(room, 2), nameOf(room, 3)]).toEqual(names);
    expect(room.log).toHaveLength(logged);
  });

  it('allows a case-only change of the own name and ignores an identical one', () => {
    const room = running();
    expect(room.renameComputer('h', 2, 'Rex')).toEqual({ ok: true });
    const logged = room.log.length;
    expect(room.renameComputer('h', 2, 'REX')).toEqual({ ok: true });
    expect(nameOf(room, 2)).toBe('REX');
    expect(room.renameComputer('h', 2, 'REX')).toEqual({ ok: true });
    expect(room.log).toHaveLength(logged + 1);
  });

  it('is refused once the game is finished', () => {
    const room = running();
    room.start('h');
    room.phase = 'finished';
    expect(room.renameComputer('h', 2, 'Rex')).toMatchObject({ reason: 'notInGame' });
    room.dispose();
  });

  it('keeps a renamed computer after the host changes', () => {
    const room = running();
    room.renameComputer('h', 2, 'Rex');
    room.start('h');
    room.leave('h');
    expect(nameOf(room, 2)).toBe('Rex');
    room.dispose();
  });

  it('blocks a former nickname reserved for a rejoin', () => {
    const room = running();
    room.start('h');
    room.leave('p');
    expect(room.renameComputer('h', 2, 'Pia')).toMatchObject({ reason: 'nicknameTaken' });
    room.dispose();
  });
});

describe('takeover names', () => {
  const duo = (hostLanguage: UiLanguage, guestLanguage: UiLanguage) => {
    const { room } = make(3, hostLanguage);
    room.join('p', 'Pia', undefined, guestLanguage);
    room.join('q', 'Quin', undefined, guestLanguage);
    room.setReady('h', true);
    room.setReady('p', true);
    room.setReady('q', true);
    room.start('h');
    return room;
  };
  const german = (name: string) =>
    GERMAN_ADJECTIVES.some((a) => Object.values(a).includes(name.split(' ')[0]));

  it("names a non-host takeover in the current host's language", () => {
    const room = duo('de', 'en');
    room.leave('p');
    expect(german(nameOf(room, 1))).toBe(true);
    room.dispose();
  });

  it("names a host takeover in the leaving host's language, not the successor's", () => {
    const room = duo('de', 'en');
    room.leave('h');
    expect(room.hostId).not.toBe('h');
    expect(german(nameOf(room, 0))).toBe(true);
    room.leave('p');
    expect(german(nameOf(room, 1))).toBe(false);
    expect(ENGLISH_ADJECTIVES).toContain(nameOf(room, 1).split(' ')[0]);
    room.dispose();
  });

  it('uses the retained language after a disconnect grace election', () => {
    jest.useFakeTimers();
    try {
      const room = duo('de', 'en');
      room.setConnected('h', false);
      jest.advanceTimersByTime(1000);
      expect(room.hostId).not.toBe('h');
      expect(german(nameOf(room, 0))).toBe(true);
      room.dispose();
    } finally {
      jest.useRealTimers();
    }
  });

  it('follows language updates of the host', () => {
    const room = duo('en', 'en');
    room.setLanguage('h', 'de');
    room.leave('p');
    expect(german(nameOf(room, 1))).toBe(true);
    room.dispose();
  });

  it('gives simultaneous takeovers unique names', () => {
    const room = duo('de', 'de');
    room.leave('p');
    room.leave('q');
    expect(nameOf(room, 1)).not.toBe(nameOf(room, 2));
    room.dispose();
  });

  it('restores the nickname on rejoin and keeps score and engine seat', () => {
    const room = duo('en', 'en');
    room.leave('p');
    const name = nameOf(room, 1);
    expect(engineNames(room)?.[1]).toBe(name);
    const score = room.game?.players[1].score;
    expect(room.rejoin('p', 'de')).toEqual({ ok: true, seat: 1 });
    expect(room.seats[1]).toMatchObject({ nickname: 'Pia', language: 'de' });
    expect(room.game?.players[1]).toEqual({ name: 'Pia', score });
    expect(JSON.stringify(toView(room, 'h'))).not.toContain(name);
    room.dispose();
  });
});

describe('GameRoom finished', () => {
  const finished = () => {
    const room = started();
    room.phase = 'finished';
    return room;
  };

  it('keeps seat order, names and scores when a player leaves', () => {
    const room = finished();
    const scores = room.game?.players.map((p) => p.score);
    expect(room.leave('p')).toMatchObject({ ok: true, empty: false });
    expect(room.seats).toHaveLength(8);
    expect(room.seats[1]).toMatchObject({
      state: 'computer',
      name: 'Pia',
      former: { playerId: 'p', nickname: 'Pia' },
    });
    expect(room.game?.players.map((p) => p.name)).toEqual(['Host', 'Pia']);
    expect(room.game?.players.map((p) => p.score)).toEqual(scores);
    expect(room.log.filter((e) => e.kind === 'left')).toHaveLength(1);
    expect(room.log.at(-1)).toMatchObject({ kind: 'left', seat: 1 });
    expect(room.rejoin('p')).toMatchObject({ reason: 'notRejoinable' });
    room.dispose();
  });

  it('elects a host when the host leaves and reports an empty room last', () => {
    const room = finished();
    expect(room.leave('h')).toMatchObject({ ok: true, empty: false });
    expect(room.hostId).toBe('p');
    expect(room.leave('p')).toMatchObject({ ok: true, empty: true });
    expect(room.humans()).toHaveLength(0);
    room.dispose();
  });

  it('treats a lost connection like a leave, without a grace period', () => {
    const room = finished();
    room.setConnected('p', false);
    expect(room.seats[1]).toMatchObject({ state: 'computer', name: 'Pia' });
    expect(room.log.some((e) => e.kind === 'disconnected')).toBe(false);
    expect(room.log.at(-1)).toMatchObject({ kind: 'left', seat: 1 });
    room.setConnected('p', true);
    expect(room.seats[1]).toMatchObject({ state: 'computer' });
    room.dispose();
  });

  it('does not touch a seat twice', () => {
    const room = finished();
    room.leave('p');
    const entries = room.log.length;
    expect(room.leave('p')).toMatchObject({ ok: true });
    expect(room.log).toHaveLength(entries);
    room.dispose();
  });
});

describe('GameRoom rematch', () => {
  /** Host, Pia, Quin and a computer (seat 3) played; the game is finished. */
  const finishedRoom = () => {
    const { room, changes } = make(5);
    room.join('p', 'Pia');
    room.join('q', 'Quin');
    room.setSeat('h', 3, 'computer', 'hard', 'high');
    room.setSeat('h', 4, 'locked');
    room.setSettings('h', { computerSpeed: 5, fastComputerDice: true, showBustProbability: true });
    for (const id of ['h', 'p', 'q']) room.setReady(id, true);
    expect(room.start('h')).toEqual({ ok: true });
    room.phase = 'finished';
    return { room, changes };
  };

  it('reopens the room as a lobby with the same settings and seat order', () => {
    const { room } = finishedRoom();
    const computer = room.seats[3];
    expect(room.rematch('h', 1)).toEqual({ ok: true, evicted: [] });
    expect(room.phase).toBe('lobby');
    expect(room.game).toBeNull();
    expect(room.round).toBe(2);
    expect(room.id).toBe('g1');
    expect(room.passwordHash).toBe('secret-hash');
    expect(room.seats.map((s) => s.state)).toEqual([
      'human',
      'reserved',
      'reserved',
      'computer',
      'locked',
      'locked',
      'locked',
      'locked',
    ]);
    expect(room.seats[3]).toEqual(computer);
    expect(room.seats[0]).toMatchObject({ nickname: 'Host', ready: false });
    expect(room.seats[1]).toMatchObject({ playerId: 'p', nickname: 'Pia' });
    expect(room).toMatchObject({
      computerSpeed: 5,
      fastComputerDice: true,
      showBustProbability: true,
      paused: false,
    });
    room.dispose();
  });

  it('starts a clean log and keeps the entry indices growing', () => {
    const { room } = finishedRoom();
    const before = room.logBase + room.log.length;
    room.rematch('h', 1);
    expect(room.log.map((e) => e.kind)).toEqual(['rematch']);
    expect(room.logBase + room.log.length).toBe(before + 1);
    room.dispose();
  });

  it('frees seats of players who left and of humans a computer replaced', () => {
    const { room } = finishedRoom();
    room.leave('q');
    expect(room.seats[2]).toMatchObject({ state: 'computer', former: { playerId: 'q' } });
    room.rematch('h', 1);
    expect(room.seats[2]).toEqual({ state: 'open' });
    expect(room.seats[1].state).toBe('reserved');
    room.dispose();
  });

  it('refuses a non-host, a stale round and a game that is not finished', () => {
    const { room } = finishedRoom();
    const log = room.log.length;
    expect(room.rematch('p', 1)).toMatchObject({ reason: 'notHost' });
    expect(room.rematch('h', 2)).toMatchObject({ reason: 'staleRound' });
    expect(room.rematch('h', 0)).toMatchObject({ reason: 'staleRound' });
    expect(room.phase).toBe('finished');
    expect(room.log).toHaveLength(log);
    room.phase = 'running';
    expect(room.rematch('h', 1)).toMatchObject({ reason: 'gameStarted' });
    room.dispose();
  });

  it('shows a waiting player the finished game with the reserved seat', () => {
    const { room } = finishedRoom();
    room.rematch('h', 1);
    const view = toView(room, 'p');
    expect(view).toMatchObject({
      phase: 'finished',
      round: 1,
      rematch: 'open',
      you: { seat: 1, reserved: 1 },
      hostId: 'h',
    });
    const computer = (room.seats[3] as { name: string }).name;
    expect(view.game?.players.map((p) => p.name)).toEqual(['Host', 'Pia', 'Quin', computer]);
    expect(view.log.some((e) => e.kind === 'rematch')).toBe(false);
    const host = toView(room, 'h');
    expect(host).toMatchObject({ phase: 'lobby', round: 2, you: { seat: 0 } });
    expect(host.rematch).toBeUndefined();
    expect(host.seats[1]).toEqual({ state: 'reserved', nickname: 'Pia' });
    room.dispose();
  });

  it('counts reserved seats as used, keeps them from newcomers and reserves the nickname', () => {
    const { room } = finishedRoom();
    room.rematch('h', 1);
    expect(room.summary().seatsUsed).toBe(4);
    expect(room.join('n', 'Pia')).toMatchObject({ reason: 'nicknameTaken' });
    expect(room.join('n', 'Nia', 1)).toMatchObject({ reason: 'seatNotFree' });
    expect(room.setSeat('h', 1, 'open')).toMatchObject({ reason: 'seatOccupied' });
    expect(room.setSeat('h', 1, 'computer')).toMatchObject({ reason: 'seatOccupied' });
    room.dispose();
  });

  it('lets a waiting player rejoin their seat, not ready, and resets the others', () => {
    const { room } = finishedRoom();
    room.rematch('h', 1);
    room.setReady('h', true);
    expect(room.rematchJoin('p', 1, 'de')).toEqual({ ok: true, seat: 1 });
    expect(room.seats[1]).toMatchObject({
      state: 'human',
      playerId: 'p',
      ready: false,
      language: 'de',
    });
    expect(room.seats[0]).toMatchObject({ ready: false });
    expect(room.log.at(-1)).toMatchObject({ kind: 'rejoined', seat: 1 });
    expect(toView(room, 'p')).toMatchObject({ phase: 'lobby', round: 2, you: { seat: 1 } });
    expect(room.rematchJoin('p', 1)).toMatchObject({ reason: 'notRejoinable' });
    room.dispose();
  });

  it('refuses a rejoin with the wrong round, without a reservation or when banned', () => {
    const { room } = finishedRoom();
    room.rematch('h', 1);
    expect(room.rematchJoin('p', 2)).toMatchObject({ reason: 'staleRound' });
    expect(room.rematchJoin('x', 1)).toMatchObject({ reason: 'notRejoinable' });
    expect(room.removeSeat('h', 2)).toEqual({ ok: true, removed: 'q' });
    expect(room.seats[2]).toEqual({ state: 'open' });
    expect(room.rematchJoin('q', 1)).toMatchObject({ reason: 'banned' });
    room.dispose();
  });

  it('frees a reservation when the waiting player leaves', () => {
    const { room } = finishedRoom();
    room.rematch('h', 1);
    expect(room.leave('p')).toMatchObject({ ok: true, empty: false });
    expect(room.seats[1]).toEqual({ state: 'open' });
    expect(room.rematchJoin('p', 1)).toMatchObject({ reason: 'notRejoinable' });
    expect(toView(room, 'p').phase).toBe('lobby');
    room.dispose();
  });

  it('does not let the old computer takeover rejoin touch a reservation', () => {
    const { room } = finishedRoom();
    room.rematch('h', 1);
    expect(room.rejoin('p')).toMatchObject({ reason: 'notRejoinable' });
    expect(room.seats[1].state).toBe('reserved');
    room.dispose();
  });

  it('starts without reserved players, drops them and refuses a late rejoin', () => {
    const { room } = finishedRoom();
    room.rematch('h', 1);
    room.rematchJoin('p', 1);
    room.setReady('h', true);
    room.setReady('p', true);
    expect(room.start('h')).toEqual({ ok: true });
    expect(room.phase).toBe('running');
    expect(room.seats[2]).toEqual({ state: 'open' });
    expect(room.game?.players.map((p) => p.score)).toEqual([0, 0, 0]);
    expect(room.dropped.has('q')).toBe(true);
    expect(toView(room, 'q')).toMatchObject({ phase: 'finished', rematch: 'closed', round: 1 });
    expect(room.rematchJoin('q', 1)).toMatchObject({ reason: 'notRejoinable' });
    expect(room.leave('q')).toMatchObject({ ok: true });
    expect(room.dropped.has('q')).toBe(false);
    room.dispose();
  });

  it('needs two players even when reserved seats exist', () => {
    const { room } = make(3);
    room.join('p', 'Pia');
    room.setReady('h', true);
    room.setReady('p', true);
    room.start('h');
    room.phase = 'finished';
    room.rematch('h', 1);
    expect(room.start('h')).toMatchObject({ reason: 'notEnoughPlayers' });
    expect(room.seats[1].state).toBe('reserved');
    room.dispose();
  });

  it('supports another rematch and rejects the older round', () => {
    const { room } = finishedRoom();
    room.rematch('h', 1);
    room.rematchJoin('p', 1);
    for (const id of ['h', 'p']) room.setReady(id, true);
    room.start('h');
    room.phase = 'finished';
    expect(room.rematch('h', 1)).toMatchObject({ reason: 'staleRound' });
    expect(room.rematch('h', 2)).toEqual({ ok: true, evicted: [] });
    expect(room.round).toBe(3);
    expect(room.rematchJoin('p', 1)).toMatchObject({ reason: 'staleRound' });
    expect(room.rematchJoin('p', 2)).toEqual({ ok: true, seat: 1 });
    room.dispose();
  });

  it('leaves everything unchanged when a request is rejected', () => {
    const { room, changes } = finishedRoom();
    room.rematch('h', 1);
    const calls = changes.length;
    const seats = JSON.stringify(room.seats);
    room.rematchJoin('p', 5);
    room.rematch('h', 1);
    room.rematch('p', 2);
    expect(changes).toHaveLength(calls);
    expect(JSON.stringify(room.seats)).toBe(seats);
    expect(room.round).toBe(2);
    room.dispose();
  });
});

describe('GameRoom spectators', () => {
  it('lets visitors watch only a running game with spectating on', () => {
    const { room, changes } = make();
    expect(room.addSpectator('v')).toMatchObject({ reason: 'notSpectatable' });
    expect(room.summary().spectatable).toBe(false);
    room.join('p', 'Pia');
    room.setReady('h', true);
    room.setReady('p', true);
    room.start('h');
    expect(room.summary().spectatable).toBe(true);
    expect(room.addSpectator('h')).toMatchObject({ reason: 'alreadyInGame' });
    const n = changes.length;
    const logLength = room.log.length;
    expect(room.addSpectator('v')).toEqual({ ok: true });
    expect(room.addSpectator('v')).toEqual({ ok: true });
    expect(changes).toHaveLength(n + 1);
    expect(changes.at(-1)).toBe(0);
    expect(room.log).toHaveLength(logLength);
    expect(room.removeSpectator('v')).toBe(true);
    expect(room.removeSpectator('v')).toBe(false);
    expect(changes).toHaveLength(n + 2);
    room.phase = 'finished';
    expect(room.addSpectator('v')).toMatchObject({ reason: 'notSpectatable' });
    expect(room.addSpectator('v', true)).toEqual({ ok: true });
    room.dispose();
  });

  it('clears spectators when the host switches spectating off and counts the change', () => {
    const room = started();
    room.addSpectator('v');
    expect(room.setSettings('p', { spectating: false })).toMatchObject({ reason: 'notHost' });
    expect(room.setSettings('h', { spectating: false })).toEqual({
      ok: true,
      changes: [{ setting: 'spectating', value: false }],
      evicted: ['v'],
    });
    expect(room.spectators.size).toBe(0);
    expect(room.summary().spectatable).toBe(false);
    expect(room.addSpectator('v')).toMatchObject({ reason: 'notSpectatable' });
    expect(room.setSettings('h', { spectating: false })).toMatchObject({ changes: [] });
    room.setSettings('h', { spectating: true });
    expect(toView(room, 'h').spectators).toBe(0);
    room.dispose();
  });

  it('does not change timers, connection or turn handling', () => {
    jest.useFakeTimers();
    try {
      const room = started();
      room.addSpectator('v');
      expect(room.hasConnectedHuman()).toBe(true);
      expect(room.humans()).toHaveLength(2);
      const first = room.seats[room.game?.current === 0 ? 0 : 1] as Human;
      jest.advanceTimersByTime(TURN_LIMIT_MS.draw);
      expect(first.timeouts).toBe(1);
      room.setConnected('h', false);
      room.setConnected('p', false);
      expect(room.hasConnectedHuman()).toBe(false);
      room.dispose();
    } finally {
      jest.useRealTimers();
    }
  });

  it('drops spectators when a rematch reopens the room', () => {
    const room = started();
    room.phase = 'finished';
    room.addSpectator('v', true);
    expect(room.rematch('h', 1)).toEqual({ ok: true, evicted: ['v'] });
    expect(room.spectators.size).toBe(0);
    room.dispose();
  });
});
