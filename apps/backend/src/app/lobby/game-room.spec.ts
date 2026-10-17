import { defaultRules, seededRandomInt } from 'game-rules';
import { GameRoom, GRACE_MS, MAX_TIMEOUTS, TURN_LIMIT_MS } from './game-room';
import { toView } from './view';

const make = (seatCount = 3) => {
  const changes: number[] = [];
  const room = new GameRoom({
    id: 'g1',
    name: 'Test',
    passwordHash: 'secret-hash',
    rules: defaultRules(),
    seatCount,
    host: { playerId: 'h', nickname: 'Host' },
    rng: seededRandomInt(1),
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
      former: { playerId: 'p', nickname: 'Pia' },
    });
    expect(['easy', 'medium', 'hard']).toContain((seat as { effective: string }).effective);
    expect(room.log.at(-1)).toMatchObject({ kind: 'replaced', seat: 1, data: 'left' });
    expect(toView(room, 'h').seats[1]).toEqual({
      state: 'computer',
      difficulty: 'random',
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

  it('lets only the host change fast computer dice, and not after the game ended', () => {
    const { room, changes } = make();
    room.join('p', 'Pia');
    expect(room.setSettings('p', true)).toMatchObject({ reason: 'notHost' });
    expect(room.fastComputerDice).toBe(false);
    const before = changes.length;
    expect(room.setSettings('h', true)).toEqual({ ok: true });
    expect(room.fastComputerDice).toBe(true);
    expect(changes).toHaveLength(before + 1);
    expect(toView(room, 'p').fastComputerDice).toBe(true);
    room.phase = 'finished';
    expect(room.setSettings('h', false)).toMatchObject({ reason: 'notInGame' });
  });

  /** Host plays until a computer is up; returns the room and whether the last action was a throw. */
  const untilComputer = (fast: boolean) => {
    const { room } = make(2);
    room.setSeat('h', 1, 'computer', 'easy');
    room.setSettings('h', fast);
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
    // a turn that ended (bust, bank) is shown as a 6 s notice before the next player moves
    return { room, thrown: last.includes('"thrown"'), ended: last.includes('"turnEnded"') };
  };

  it('waits for the dice to stop before the computer acts, else 2 s', () => {
    const { room, thrown, ended } = untilComputer(false);
    const n = room.log.length;
    const delay = (thrown ? 5000 + 3250 : 2000) + (ended ? 6000 : 0);
    jest.advanceTimersByTime(delay - 1);
    expect(room.log).toHaveLength(n);
    jest.advanceTimersByTime(1);
    expect(room.log.length).toBeGreaterThan(n);
    room.dispose();
  });

  it('shows a computer pick as preview for 2 s before applying it', () => {
    const { room } = untilComputer(false);
    // step the computer until its pick is shown but not yet applied
    for (let i = 0; i < 2000 && room.preview.length === 0; i++) jest.advanceTimersByTime(100);
    expect(room.preview.length).toBeGreaterThan(0);
    expect(room.game?.turn?.phase).toBe('select');
    jest.advanceTimersByTime(2000);
    expect(room.preview).toEqual([]);
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
