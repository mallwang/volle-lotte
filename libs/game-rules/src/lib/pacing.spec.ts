import { COMPUTER_SPEEDS, DEFAULT_SPEED, isComputerSpeed, pacing } from './pacing.js';

/** Notice + draw + throw + select + throw + select + bank, normal dice (roll maximum 3000). */
const modelTurn = (step: number) => {
  const p = pacing(step);
  const throwWait = 3000 + p.afterRollMs;
  return p.noticeMs + p.pauseMs + 2 * throwWait + 2 * p.pauseMs + p.pauseMs;
};

describe('pacing', () => {
  it.each(['pauseMs', 'afterRollMs', 'noticeMs'] as const)(
    '%s decreases from step 1 to 5',
    (key) => {
      for (let i = 1; i < COMPUTER_SPEEDS.length; i++) {
        expect(pacing(i + 1)[key]).toBeLessThan(pacing(i)[key]);
      }
    },
  );

  it('step 2 equals the legacy values', () => {
    expect(pacing(2)).toEqual({ pauseMs: 2000, afterRollMs: 3250, noticeMs: 6000 });
  });

  it.each([0, 6, 2.5, '3', NaN, undefined])('falls back to the default row for %p', (x) => {
    expect(pacing(x)).toEqual(pacing(DEFAULT_SPEED));
  });

  it('validates steps', () => {
    expect(COMPUTER_SPEEDS.every(isComputerSpeed)).toBe(true);
    expect([0, 6, 2.5, '3', null].some(isComputerSpeed)).toBe(false);
  });

  it('the default is at least 25% faster than step 2 (SC-001)', () => {
    expect(modelTurn(DEFAULT_SPEED)).toBeLessThanOrEqual(modelTurn(2) * 0.75);
  });

  it('step 5 takes less than a third of step 1 (SC-002)', () => {
    expect(modelTurn(5)).toBeLessThan(modelTurn(1) / 3);
  });
});
