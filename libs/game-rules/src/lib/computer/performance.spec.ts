import { chooseAction } from '../computer.js';
import type { Profile } from '../computer.js';
import { MAX_TABLES } from './constants.js';
import { situation } from './testing.js';
import { tableCount } from './value.js';
import { clearCaches } from './warm.js';

const profile: Profile = { difficulty: 'hard', risk: 'high' };
const rng = () => 0;
// coverage instrumentation slows the code down; the budgets below are for plain code
const slowdown = '__coverage__' in globalThis ? 3 : 1;
const states = () => [
  situation({ run: 900, free: 0 }),
  situation({ phase: 'select', dice: [1, 5, 1, 2, 3, 6], free: 6, run: 0 }),
  situation({ run: 600, free: 4 }),
];

describe('performance', () => {
  it('decides within 50 ms even on the first, cold decision', () => {
    for (const state of states()) {
      // best of a few cold runs: a single run can be hit by a GC pause or a busy CI machine
      const times = Array.from({ length: 5 }, () => {
        clearCaches();
        const start = performance.now();
        chooseAction(state, profile, rng);
        return performance.now() - start;
      });
      expect(Math.min(...times)).toBeLessThan(50 * slowdown);
    }
  });

  it('decides in well under a millisecond once warm', () => {
    const list = states();
    for (const s of list) chooseAction(s, profile, rng);
    const rounds = 300;
    const start = performance.now();
    for (let i = 0; i < rounds; i++) for (const s of list) chooseAction(s, profile, rng);
    expect((performance.now() - start) / (rounds * list.length)).toBeLessThan(slowdown);
  });

  it('keeps the cache bounded with many distinct minimum points', () => {
    for (let minimumPoints = 0; minimumPoints < 5 * MAX_TABLES; minimumPoints++) {
      chooseAction(situation({ run: 900, free: 3 }, { rules: { minimumPoints } }), profile, rng);
    }
    expect(tableCount()).toBeLessThanOrEqual(MAX_TABLES);
  });
});
