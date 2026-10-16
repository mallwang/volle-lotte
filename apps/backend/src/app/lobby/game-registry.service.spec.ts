import { defaultRules } from 'game-rules';
import { GameRegistryService, LOBBY_CLEANUP_MS } from './game-registry.service';

const make = (reg: GameRegistryService) =>
  reg.create({
    name: 'T',
    passwordHash: 'x',
    rules: defaultRules(),
    seatCount: 2,
    graceMs: 10 * 24 * 3_600_000, // longer than any cleanup timer
    host: { playerId: 'h', nickname: 'Host' },
  });

describe('GameRegistryService', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('creates, lists and removes rooms', () => {
    const reg = new GameRegistryService();
    const room = make(reg);
    expect(reg.get(room.id)).toBe(room);
    expect(reg.list()).toEqual([
      expect.objectContaining({ id: room.id, seatsUsed: 1, seatsTotal: 2 }),
    ]);
    reg.remove(room.id);
    expect(reg.get(room.id)).toBeUndefined();
  });

  it('removes a lobby after 15 min without a connected human; a reconnect cancels it', () => {
    const reg = new GameRegistryService();
    const closed = jest.fn();
    reg.onClosed = closed;
    const room = make(reg);
    room.setConnected('h', false);
    jest.advanceTimersByTime(LOBBY_CLEANUP_MS - 1);
    room.setConnected('h', true);
    jest.advanceTimersByTime(LOBBY_CLEANUP_MS * 2);
    expect(closed).not.toHaveBeenCalled();
    room.setConnected('h', false);
    jest.advanceTimersByTime(LOBBY_CLEANUP_MS);
    expect(closed).toHaveBeenCalledWith(room, 'cleanup');
    expect(reg.get(room.id)).toBeUndefined();
  });

  // ponytail: turn timers now play idle games out via computers, so the 24 h cleanup is only a safety net
  it('keeps a running game while nobody is connected', () => {
    const reg = new GameRegistryService();
    const room = make(reg);
    room.join('p', 'Pia');
    room.setReady('h', true);
    room.setReady('p', true);
    room.start('h');
    room.setConnected('h', false);
    room.setConnected('p', false);
    jest.advanceTimersByTime(60_000);
    expect(reg.get(room.id)).toBe(room);
  });

  it('closes an empty lobby', () => {
    const reg = new GameRegistryService();
    const room = make(reg);
    room.leave('h');
    expect(reg.get(room.id)).toBeUndefined();
  });
});
