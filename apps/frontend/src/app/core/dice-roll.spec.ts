import { TestBed } from '@angular/core/testing';
import { DiceRollService, rollDurations } from './dice-roll';

describe('rollDurations', () => {
  it('stays inside the range, independently per die', () => {
    const d = rollDurations(200, [2000, 5000]);
    expect(d.every((x) => x >= 2000 && x <= 5000)).toBe(true);
    expect(new Set(d).size).toBeGreaterThan(1);
    expect(rollDurations(1, [10, 20], () => 0)).toEqual([10]);
    expect(rollDurations(1, [10, 20], () => 0.999999)).toEqual([20]);
  });
});

describe('DiceRollService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  const svc = () => TestBed.inject(DiceRollService);

  it('shows the server value only after each die has stopped', () => {
    const s = svc();
    s.start(2);
    expect(s.rolling()).toBe(true);
    expect(s.isRolling(0) && s.isRolling(1)).toBe(true);
    expect(s.faceFor(0, 4)).toBeGreaterThanOrEqual(1);
    vi.advanceTimersByTime(999); // every die rolls at least 1 s
    expect(s.rolling()).toBe(true);
    vi.advanceTimersByTime(2001); // and at most 3 s
    expect(s.rolling()).toBe(false);
    expect(s.faceFor(0, 4)).toBe(4);
    expect(s.faceFor(1, 6)).toBe(6);
  });

  it('computer-fast ends within 1.5 s', () => {
    const s = svc();
    s.start(3, { computerFast: true });
    vi.advanceTimersByTime(1500);
    expect(s.rolling()).toBe(false);
  });

  it('skip never rolls', () => {
    const s = svc();
    s.start(3, { skip: true });
    expect(s.rolling()).toBe(false);
  });

  it('a new roll replaces a running one', () => {
    const s = svc();
    s.start(2);
    s.start(1, { computerFast: true });
    vi.advanceTimersByTime(1500);
    expect(s.rolling()).toBe(false);
  });
});
