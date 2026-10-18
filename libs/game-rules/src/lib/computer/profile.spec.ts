import { scriptedRandomInt } from '../rng.js';
import { resolve } from './profile.js';

describe('resolve', () => {
  it('passes concrete values through without consuming the rng', () => {
    const rng = scriptedRandomInt([]);
    expect(resolve({ difficulty: 'hard', risk: 'none' }, rng)).toEqual({
      skill: 'hard',
      risk: 'none',
    });
  });

  it('draws skill first, then risk, one rng(3) each', () => {
    const calls: number[] = [];
    const rng = (max: number) => {
      calls.push(max);
      return calls.length === 1 ? 2 : 0;
    };
    expect(resolve({ difficulty: 'random', risk: 'random' }, rng)).toEqual({
      skill: 'hard',
      risk: 'none',
    });
    expect(calls).toEqual([3, 3]);
  });

  it('varies only the random part', () => {
    const rng = scriptedRandomInt([1]);
    expect(resolve({ difficulty: 'random', risk: 'medium' }, rng)).toEqual({
      skill: 'medium',
      risk: 'medium',
    });
  });
});
