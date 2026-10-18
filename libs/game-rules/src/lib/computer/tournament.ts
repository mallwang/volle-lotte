import { chooseAction } from '../computer.js';
import type { Profile } from '../computer.js';
import { applyAction, createGame } from '../game.js';
import { seededRandomInt } from '../rng.js';
import { defaultRules } from '../types.js';
import type { Rules } from '../types.js';

/** Plays seeded games between computers; returns the number of wins per seat (clover wins included). */
export function tournament(
  profiles: readonly Profile[],
  games: number,
  options: { rules?: Rules; seed?: number } = {},
): number[] {
  const wins = profiles.map(() => 0);
  for (let g = 0; g < games; g++) {
    const rng = seededRandomInt((options.seed ?? 1) * 100_003 + g);
    // rotate the starting seat so that no profile profits from moving first
    const shift = g % profiles.length;
    const seats = profiles.map((_, i) => (i + shift) % profiles.length);
    let state = createGame(
      seats.map((s) => `p${s}`),
      options.rules ?? { ...defaultRules(), targetScore: 3000 },
      rng,
    );
    for (let i = 0; i < 100_000 && !state.result; i++) {
      const out = applyAction(state, chooseAction(state, profiles[seats[state.current]], rng), rng);
      if (!out.ok) throw new Error(out.reason);
      state = out.state;
    }
    if (!state.result) throw new Error(`game ${g} did not end`);
    wins[seats[state.result.winner]]++;
  }
  return wins;
}
