import type { Profile } from '../computer.js';
import { MAX_TABLES } from './constants.js';
import { situation } from './testing.js';

const profile: Profile = { difficulty: 'hard', risk: 'high' };

describe('performance', () => {
  it('decides within 50 ms even on the first, cold decision', () => {
    jest.isolateModules(() => {
      const { chooseAction } = require('../computer.js') as typeof import('../computer.js');
      const rng = () => 0;
      const states = [
        situation({ run: 900, free: 0 }),
        situation({ phase: 'select', dice: [1, 5, 1, 2, 3, 6], free: 6, run: 0 }),
        situation({ run: 600, free: 4 }),
      ];
      for (const state of states) {
        const start = performance.now();
        chooseAction(state, profile, rng);
        expect(performance.now() - start).toBeLessThan(50);
      }
    });
  });

  it('decides in well under a millisecond once warm', async () => {
    const { chooseAction } = await import('../computer.js');
    const rng = () => 0;
    const states = [
      situation({ run: 900, free: 0 }),
      situation({ phase: 'select', dice: [1, 5, 1, 2, 3, 6], free: 6, run: 0 }),
      situation({ run: 600, free: 4 }),
    ];
    for (const s of states) chooseAction(s, profile, rng);
    const rounds = 300;
    const start = performance.now();
    for (let i = 0; i < rounds; i++) for (const s of states) chooseAction(s, profile, rng);
    expect((performance.now() - start) / (rounds * states.length)).toBeLessThan(1);
  });

  it('keeps the cache bounded with many distinct minimum points', async () => {
    const { chooseAction } = await import('../computer.js');
    const { tableCount } = await import('./value.js');
    for (let minimumPoints = 0; minimumPoints < 5 * MAX_TABLES; minimumPoints++) {
      chooseAction(
        situation({ run: 900, free: 3 }, { rules: { minimumPoints } }),
        profile,
        () => 0,
      );
    }
    expect(tableCount()).toBeLessThanOrEqual(MAX_TABLES);
  });
});
