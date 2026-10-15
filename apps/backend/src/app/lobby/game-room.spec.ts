import { defaultRules, seededRandomInt } from 'game-rules';
import { GameRoom } from './game-room';
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

  it('views hide the deck and the hash', () => {
    const room = started();
    const json = JSON.stringify(toView(room, 'h'));
    expect(json).not.toContain('secret-hash');
    expect(toView(room, 'h').game).not.toHaveProperty('deck');
    expect(toView(room, 'h').game?.deckSize).toBeGreaterThan(0);
  });
});

describe('GameRoom leaving', () => {
  it('a leaver in a running game counts as gone and waits for the host', () => {
    const room = started();
    room.leave('p');
    expect(room.hasConnectedHuman()).toBe(true);
    expect(room.pending.has(room.seatOf('p'))).toBe(true);
    room.leave('h');
    expect(room.hasConnectedHuman()).toBe(false);
    room.dispose();
  });
});

describe('GameRoom connection', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('frees a lobby seat after the grace period and hands over host', () => {
    const { room } = make();
    room.join('p', 'Pia');
    room.setConnected('h', false);
    expect(toView(room, 'p').graceEndsAt[0]).toBeGreaterThan(0);
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

  it('pauses a running game, lets the host hand the seat to a computer, which then plays', () => {
    const room = started();
    const cur = room.game?.current === 0 ? 'h' : 'p';
    const waiting = cur === 'h' ? 'p' : 'h';
    // make the non-host drop; if it is the host's turn the host can still not be paused, so end the turn first
    const dropped = 'p';
    room.setConnected(dropped, false);
    jest.advanceTimersByTime(1000);
    const seat = room.seatOf(dropped);
    expect(room.pending.has(seat)).toBe(true);
    expect(room.isPaused()).toBe(dropped === (room.game?.current === 0 ? 'h' : 'p'));
    expect(room.decide('p', seat, 'computer')).toMatchObject({ reason: 'notHost' });
    expect(room.decide('h', seat, 'computer', 'easy')).toMatchObject({ ok: true, removed: 'p' });
    expect(room.pending.size).toBe(0);
    expect(waiting).toBeDefined();
    room.dispose();
  });
});
