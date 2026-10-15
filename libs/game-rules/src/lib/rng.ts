import type { RandomInt } from './types.js';

/** Fisher-Yates; returns a new array. */
export function shuffle<T>(items: readonly T[], rng: RandomInt): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = rng(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Deterministic PRNG (mulberry32), for tests and simulations. */
export function seededRandomInt(seed: number): RandomInt {
  let state = seed >>> 0;
  return (maxExclusive) => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * maxExclusive);
  };
}

/** Returns the given numbers in order, throws when exhausted. For scripting dice and shuffles in specs. */
export function scriptedRandomInt(values: readonly number[]): RandomInt {
  let next = 0;
  return () => {
    if (next >= values.length) throw new Error('scripted random source exhausted');
    return values[next++];
  };
}
