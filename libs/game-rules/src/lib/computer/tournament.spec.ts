import type { Profile } from '../computer.js';
import { tournament } from './tournament.js';

const at = (difficulty: Profile['difficulty'], risk: Profile['risk'] = 'medium'): Profile => ({
  difficulty,
  risk,
});

describe('seeded tournament', () => {
  it('hard beats medium beats easy', () => {
    const games = 1000;
    const [hard, medium, easy] = tournament([at('hard'), at('medium'), at('easy')], games);
    const even = games / 3;
    const margin = games * 0.05;
    expect(hard).toBeGreaterThan(medium);
    expect(medium).toBeGreaterThan(easy);
    expect(hard).toBeGreaterThan(even + margin);
    expect(hard - medium).toBeGreaterThan(margin / 2);
    expect(medium).toBeGreaterThan(even + margin / 5);
    expect(medium - easy).toBeGreaterThan(margin);
  }, 120_000);
});
