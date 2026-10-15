import { scriptedRandomInt, seededRandomInt, shuffle } from './rng.js';

describe('rng', () => {
  it('shuffle returns a permutation and leaves the input alone', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffle(input, seededRandomInt(1));
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('seededRandomInt is deterministic and stays in range', () => {
    const a = seededRandomInt(42);
    const b = seededRandomInt(42);
    for (let i = 0; i < 1000; i++) {
      const v = a(6);
      expect(v).toBe(b(6));
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(6);
    }
  });

  it('scriptedRandomInt replays values and throws when exhausted', () => {
    const rng = scriptedRandomInt([3, 1]);
    expect([rng(6), rng(6)]).toEqual([3, 1]);
    expect(() => rng(6)).toThrow('exhausted');
  });
});
