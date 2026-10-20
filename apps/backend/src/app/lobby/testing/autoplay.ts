import { chooseAction, seededRandomInt, type GameState } from 'game-rules';
import { toView } from '../view';
import { registry, type Client } from './client';

/**
 * A scripted human player. It reads the server-side room, not the pushes, so it works with every
 * protocol version. On its turn it plays the computer strategy: draw, select, then bank or throw.
 * Returns a function that stops it.
 */
export function autoplay(
  client: Client,
  playerId: string,
  gameId: string,
  seed: number,
): () => void {
  const rng = seededRandomInt(seed);
  let sent = '';
  let sending = false;
  const timer = setInterval(() => {
    const room = registry().get(gameId);
    if (!room || sending || room.phase !== 'running') return;
    const view = toView(room, playerId);
    const state = view.game;
    if (!state?.turn || state.result) return;
    const engine = view.seats
      .slice(0, view.you.seat)
      .filter((s) => s.state === 'human' || s.state === 'computer').length;
    if (state.current !== engine) return;
    const key = JSON.stringify([state.current, state.turn, state.players, room.log.length]);
    if (key === sent) return;
    sent = key;
    const action = chooseAction(
      { ...state, deck: [] } as unknown as GameState,
      { difficulty: 'medium', risk: 'medium' },
      rng,
    );
    sending = true;
    void client.send('turn:action', { action }).finally(() => (sending = false));
  }, 5);
  return () => clearInterval(timer);
}
