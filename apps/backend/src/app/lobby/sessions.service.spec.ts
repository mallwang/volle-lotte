import { SessionsService, validNickname } from './sessions.service';

describe('validNickname', () => {
  it.each([
    ['  Anna  ', 'Anna'],
    ['a_b-1 2', 'a_b-1 2'],
  ])('accepts %j', (input, expected) => expect(validNickname(input)).toBe(expected));

  it.each(['a', 'x'.repeat(21), 'Jürgen', 'a<b>', '', ' a ', 5, undefined])('rejects %j', (input) =>
    expect(validNickname(input)).toBeNull(),
  );
});

describe('SessionsService', () => {
  let t: number;
  let sessions: SessionsService;
  beforeEach(() => {
    t = 0;
    sessions = new SessionsService(() => t);
  });

  it('creates secret tokens and public ids of the right size', () => {
    const s = sessions.create('Anna');
    expect(s.token).toMatch(/^[0-9a-f]{64}$/);
    expect(s.playerId).toMatch(/^[0-9a-f]{16}$/);
    expect(sessions.byTokenValue(s.token)).toBe(s);
    expect(sessions.byPlayerId(s.playerId)).toBe(s);
  });

  it('keeps the reported UI language and defaults to English', () => {
    expect(sessions.create('Anna').language).toBe('en');
    expect(sessions.create('Ben', 'de').language).toBe('de');
  });

  it('allows one active socket per token', () => {
    const s = sessions.create('Anna');
    expect(sessions.attach(s, 'a')).toBeUndefined();
    expect(sessions.attach(s, 'b')).toBe('a');
    expect(sessions.bySocketId('a')).toBeUndefined();
    expect(sessions.bySocketId('b')).toBe(s);
    expect(sessions.detach('a')).toBeUndefined();
    expect(sessions.detach('b')).toBe(s);
    expect(s.socketId).toBeUndefined();
  });

  it('sweeps only idle sessions without game or socket', () => {
    const idle = sessions.create('Idle');
    const seated = sessions.create('Seated');
    seated.gameId = 'g';
    const online = sessions.create('Online');
    sessions.attach(online, 's');
    t = 24 * 3_600_000;
    expect(sessions.sweep()).toBe(1);
    expect(sessions.byTokenValue(idle.token)).toBeUndefined();
    expect(sessions.byTokenValue(seated.token)).toBe(seated);
    expect(sessions.byTokenValue(online.token)).toBe(online);
  });
});
