import type { Profile } from '../computer.js';
import { tournament } from './tournament.js';

const at = (difficulty: Profile['difficulty'], risk: Profile['risk'] = 'medium'): Profile => ({
  difficulty,
  risk,
});

describe('seeded tournament', () => {
  it('hard beats medium beats easy across independent seeds', () => {
    const gamesPerSeed = 1000;
    const seeds = [1, 2, 3];
    const totals = [0, 0, 0];
    for (const seed of seeds) {
      const wins = tournament([at('hard'), at('medium'), at('easy')], gamesPerSeed, { seed });
      expect(wins[0]).toBeGreaterThan(wins[1]);
      expect(wins[1]).toBeGreaterThan(wins[2]);
      wins.forEach((n, i) => (totals[i] += n));
    }
    const [hard, medium, easy] = totals;
    // Require a separation above two standard deviations, not a fixed share of all wins.
    expect(hard - medium).toBeGreaterThan(2 * Math.sqrt(hard + medium));
    expect(medium - easy).toBeGreaterThan(2 * Math.sqrt(medium + easy));
  }, 120_000);
});
