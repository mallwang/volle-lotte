import { scoreDice } from '../scoring.js';
import { allDiceStats, bustProbability, outcomes, streetChance } from './odds.js';

describe('outcomes', () => {
  it('has 923 distinct results over 1..6 dice and probabilities summing to 1', () => {
    let total = 0;
    for (let n = 1; n <= 6; n++) {
      for (const doubling of [true, false]) {
        const list = outcomes(n, doubling);
        expect(list.reduce((s, o) => s + o.prob, 0)).toBeCloseTo(1, 12);
        if (doubling) total += list.length;
      }
    }
    expect(total).toBe(923);
    expect(outcomes(6, true)).toHaveLength(462);
  });

  it('matches the known bust probabilities', () => {
    const expected = [0.667, 0.444, 0.278, 0.157, 0.077, 0.031];
    expected.forEach((p, i) => expect(bustProbability(i + 1, true)).toBeCloseTo(p, 3));
  });

  it('uses missing Street faces rather than scoring combinations', () => {
    expect(bustProbability(6, true, [])).toBe(0);
    expect(bustProbability(4, true, [1, 2])).toBeCloseTo((2 / 6) ** 4, 12);
    expect(bustProbability(1, true, [1, 2, 3, 4, 5])).toBeCloseTo(5 / 6, 12);
    expect(bustProbability(1, false, [1, 2, 3, 4, 5])).toBeCloseTo(5 / 6, 12);
  });

  it.each([0, 7, -1, 1.5])('rejects an invalid dice count %i', (n) => {
    expect(() => bustProbability(n, true)).toThrow(RangeError);
  });

  it('agrees with scoreDice for picks and marks the all-dice pick', () => {
    // 1,1,1,1,5,5: all six dice score in both variants
    for (const doubling of [true, false]) {
      const expected = scoreDice([1, 1, 1, 1, 5, 5], { fourOfAKindDoubling: doubling });
      const found = outcomes(6, doubling).find(
        (o) =>
          Math.abs(o.prob - 15 / 6 ** 6) < 1e-12 &&
          o.picks.some((p) => p.dice === 6 && p.points === expected),
      );
      expect(found?.all).toEqual({ points: expected, dice: 6 });
    }
    expect(outcomes(1, true).find((o) => o.picks.length === 0)?.all).toBeNull();
  });
});

describe('allDiceStats', () => {
  it('accounts for every run', () => {
    for (const doubling of [true, false]) {
      const s = allDiceStats(doubling);
      expect(s.volleLotte + s.bust).toBeCloseTo(1, 9);
      expect(s.volleLotte).toBeGreaterThan(0.05);
      expect(s.endRun).toBeGreaterThan(s.bustRun);
    }
  });
});

describe('streetChance', () => {
  it('matches a brute-force simulation of the street rule', () => {
    // exact brute force: recursion over all 6^k throws
    const memo = new Map<string, number>();
    const brute = (have: Set<number>): number => {
      const k = 6 - have.size;
      if (k === 0) return 1;
      const key = [...have].sort().join();
      const known = memo.get(key);
      if (known !== undefined) return known;
      let sum = 0;
      const throwAll = (left: number, faces: number[]): void => {
        if (left === 0) {
          const gain = faces.filter((f) => !have.has(f));
          if (gain.length > 0) sum += brute(new Set([...have, ...gain])) / 6 ** k;
          return;
        }
        for (let f = 1; f <= 6; f++) throwAll(left - 1, [...faces, f]);
      };
      throwAll(k, []);
      memo.set(key, sum);
      return sum;
    };
    expect(streetChance()).toBeCloseTo(brute(new Set()), 9);
  });
});
