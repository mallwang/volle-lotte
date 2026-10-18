import { chooseAction } from '../computer.js';
import type { Profile } from '../computer.js';
import { seededRandomInt } from '../rng.js';
import { RISK_KAPPA } from './constants.js';
import { kappaFor, reachesTarget, situationShift } from './situation.js';
import { situation } from './testing.js';

const share = (state: ReturnType<typeof situation>, profile: Profile, type: string, n = 2000) => {
  const rng = seededRandomInt(21);
  let hits = 0;
  for (let i = 0; i < n; i++) if (chooseAction(state, profile, rng).type === type) hits++;
  return hits / n;
};

describe('score situation', () => {
  it('shifts kappa down when behind and up close to the target', () => {
    const level = situationShift(situation({}, { scores: [2000, 2000] }));
    const behind = situationShift(situation({}, { scores: [0, 5000] }));
    const near = situationShift(situation({}, { scores: [5500, 2000] }));
    expect(level).toBe(0);
    expect(behind).toBeLessThan(level);
    expect(near).toBeGreaterThan(level);
    expect(kappaFor(situation({}, { scores: [0, 5000] }), 'medium')).toBe(
      RISK_KAPPA.medium + behind,
    );
  });

  it('draws more often when far behind and less often when close to the target', () => {
    const turn = { run: 900, free: 0 };
    const profile: Profile = { difficulty: 'hard', risk: 'medium' };
    const level = share(situation(turn, { scores: [2000, 2000] }), profile, 'draw');
    const behind = share(situation(turn, { scores: [0, 5900] }), profile, 'draw');
    const near = share(situation(turn, { scores: [5000, 2000] }), profile, 'draw');
    expect(behind).toBeGreaterThan(level);
    expect(near).toBeLessThan(level);
  });

  it('throws on more often when far behind', () => {
    const turn = { run: 700, free: 4 };
    const profile: Profile = { difficulty: 'hard', risk: 'medium' };
    const level = share(situation(turn, { scores: [2000, 2000] }), profile, 'throw');
    const behind = share(situation(turn, { scores: [0, 5900] }), profile, 'throw');
    expect(behind).toBeGreaterThanOrEqual(level);
  });

  it('banks when banking reaches the target, whatever skill and risk', () => {
    const state = situation({ run: 600, free: 5 }, { scores: [5500, 0] });
    expect(reachesTarget(state, 600)).toBe(true);
    for (const difficulty of ['easy', 'medium', 'hard', 'random'] as const) {
      for (const risk of ['none', 'medium', 'high', 'random'] as const) {
        const rng = seededRandomInt(3);
        for (let i = 0; i < 20; i++) {
          expect(chooseAction(state, { difficulty, risk }, rng)).toEqual({ type: 'bank' });
        }
      }
    }
  });

  it('also banks after a Volle Lotte that reaches the target', () => {
    const state = situation({ run: 900, free: 0 }, { scores: [5200, 0] });
    expect(chooseAction(state, { difficulty: 'hard', risk: 'high' }, seededRandomInt(1))).toEqual({
      type: 'bank',
    });
  });
});
