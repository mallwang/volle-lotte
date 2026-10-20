import { defaultRules, seededRandomInt } from 'game-rules';
import { GameRoom } from './game-room';
import { toView } from './view';

const finishedRoom = () => {
  const room = new GameRoom({
    id: 'v1',
    name: 'View',
    passwordHash: 'hash',
    rules: defaultRules(),
    seatCount: 3,
    host: { playerId: 'h', nickname: 'Host' },
    rng: seededRandomInt(1),
    nameRng: seededRandomInt(2),
  });
  room.join('p', 'Pia');
  room.join('q', 'Quin');
  for (const id of ['h', 'p', 'q']) room.setReady(id, true);
  room.start('h');
  room.phase = 'finished';
  return room;
};

describe('toView', () => {
  it('carries the round and never the deck', () => {
    const room = finishedRoom();
    const view = toView(room, 'h');
    expect(view.round).toBe(1);
    expect(view.rematch).toBeUndefined();
    expect(view.game).toHaveProperty('deckSize');
    expect(JSON.stringify(view)).not.toContain('"deck"');
    room.dispose();
  });

  it('sends the rules once, not again inside the game part, and leaves n to the sync service', () => {
    const room = finishedRoom();
    for (const id of ['h', 'p']) {
      const view = toView(room, id);
      expect(view.rules).toEqual(room.rules);
      expect(view.game).not.toHaveProperty('rules');
      expect(view.n).toBe(0);
    }
    room.rematch('h', 1);
    expect(toView(room, 'q').game).not.toHaveProperty('rules');
    room.dispose();
  });

  it('shows a reserved seat in the lobby with the nickname only', () => {
    const room = finishedRoom();
    room.rematch('h', 1);
    room.rematchJoin('p', 1);
    for (const id of ['h', 'p']) {
      expect(toView(room, id).seats[2]).toEqual({ state: 'reserved', nickname: 'Quin' });
    }
    room.dispose();
  });

  it('gives a waiting player the finished game with their old seat', () => {
    const room = finishedRoom();
    room.rematch('h', 1);
    const view = toView(room, 'q');
    expect(view).toMatchObject({
      phase: 'finished',
      round: 1,
      rematch: 'open',
      hostId: 'h',
      you: { playerId: 'q', seat: 2, reserved: 2, timeoutWarning: false },
    });
    expect(view.seats.map((s) => s.state).slice(0, 3)).toEqual(['human', 'human', 'human']);
    expect(view.game?.players.map((p) => p.name)).toEqual(['Host', 'Pia', 'Quin']);
    expect(JSON.stringify(view)).not.toContain('"deck"');
    room.dispose();
  });

  it('marks a player the start dropped as closed and shows others the lobby', () => {
    const room = finishedRoom();
    room.rematch('h', 1);
    room.rematchJoin('p', 1);
    room.setReady('h', true);
    room.setReady('p', true);
    room.start('h');
    expect(toView(room, 'q')).toMatchObject({ phase: 'finished', rematch: 'closed', round: 1 });
    expect(toView(room, 'q').you.reserved).toBeUndefined();
    expect(toView(room, 'h')).toMatchObject({ phase: 'running', round: 2 });
    room.dispose();
  });
});

describe('toView for spectators', () => {
  it('marks the spectator, counts them for everyone and leaks no deck', () => {
    const room = finishedRoom();
    room.phase = 'running';
    room.addSpectator('v');
    const spectator = toView(room, 'v');
    expect(spectator.you).toEqual({
      playerId: 'v',
      seat: -1,
      timeoutWarning: false,
      spectator: true,
    });
    expect(spectator.spectators).toBe(1);
    expect(spectator.spectating).toBe(true);
    expect(JSON.stringify(spectator)).not.toContain('"deck"');
    const player = toView(room, 'p');
    expect(player.spectators).toBe(1);
    expect(player.you.spectator).toBeUndefined();
    room.dispose();
  });
});
