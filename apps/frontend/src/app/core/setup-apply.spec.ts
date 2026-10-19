import type { SeatView } from 'game-rules';
import { applySetup } from './setup-apply';
import { gameView, stubSocket } from './testing';

const human: SeatView = { state: 'human', playerId: 'p0', nickname: 'Ann' };
const computer: SeatView = { state: 'computer', difficulty: 'easy', risk: 'none' };

function socketWith(...acks: unknown[]) {
  const socket = stubSocket();
  socket.send.mockResolvedValue({ ok: true });
  acks.forEach((a) => socket.send.mockResolvedValueOnce(a));
  return socket;
}

describe('applySetup', () => {
  it('places computers in order and sets the speed', async () => {
    const socket = socketWith();
    const game = gameView({}, [human]);
    const result = await applySetup(
      socket,
      game,
      [
        { seat: 2, difficulty: 'hard', risk: 'high' },
        { seat: 1, difficulty: 'easy', risk: 'none' },
      ],
      { speed: 5 },
    );
    expect(result).toEqual({ ok: true, placed: 2, skipped: 0 });
    expect(socket.send.mock.calls).toEqual([
      ['seat:set', { seat: 1, mode: 'computer', difficulty: 'easy', risk: 'none' }],
      ['seat:set', { seat: 2, mode: 'computer', difficulty: 'hard', risk: 'high' }],
      ['game:settings', { computerSpeed: 5 }],
    ]);
  });

  it('clears the old computers that are not reused and counts the ones that do not fit', async () => {
    const socket = socketWith();
    const game = gameView({}, [human, computer, computer, { state: 'locked' }]);
    const result = await applySetup(socket, game, [
      { seat: 1, difficulty: 'hard', risk: 'high' },
      { seat: 2, difficulty: 'easy', risk: 'none' },
      { seat: 3, difficulty: 'easy', risk: 'none' },
    ]);
    expect(result).toEqual({ ok: true, placed: 2, skipped: 1 });
    expect(socket.send.mock.calls.map((c) => [c[0], c[1].seat])).toEqual([
      ['seat:set', 1],
      ['seat:set', 2],
    ]);
  });

  it('opens an old computer seat that gets no new computer', async () => {
    const socket = socketWith();
    const game = gameView({}, [human, computer, computer]);
    await applySetup(socket, game, [{ seat: 1, difficulty: 'hard', risk: 'high' }]);
    expect(socket.send.mock.calls[0]).toEqual(['seat:set', { seat: 2, mode: 'open' }]);
  });

  it('sends no speed without one or when it is unchanged', async () => {
    const socket = socketWith();
    await applySetup(socket, gameView(), [], undefined);
    await applySetup(socket, gameView({ computerSpeed: 4 }), [], { speed: 4 });
    expect(socket.send).not.toHaveBeenCalled();
  });

  it('stops at the first failure and returns the ack', async () => {
    const socket = socketWith({ ok: true }, { ok: false, reason: 'rejected' });
    const result = await applySetup(
      socket,
      gameView({}, [human]),
      [
        { seat: 1, difficulty: 'easy', risk: 'none' },
        { seat: 2, difficulty: 'easy', risk: 'none' },
        { seat: 3, difficulty: 'easy', risk: 'none' },
      ],
      { speed: 5 },
    );
    expect(result).toEqual({ ok: false, ack: { ok: false, reason: 'rejected' } });
    expect(socket.send).toHaveBeenCalledTimes(2);
  });

  it('returns a failing speed change', async () => {
    const socket = socketWith({ ok: false, reason: 'notHost' });
    const result = await applySetup(socket, gameView(), [], { speed: 5 });
    expect(result).toEqual({ ok: false, ack: { ok: false, reason: 'notHost' } });
  });

  it('returns a failing clear', async () => {
    const socket = socketWith({ ok: false, reason: 'notHost' });
    const result = await applySetup(socket, gameView({}, [human, computer]), []);
    expect(result.ok).toBe(false);
  });
});
