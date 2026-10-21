import { TestBed } from '@angular/core/testing';
import { BURST_INTERVAL_MS, Celebration } from './celebration';

const confetti = vi.fn();
vi.mock('party-js', () => ({
  confetti: (...args: unknown[]) => confetti(...args),
  Rect: class {},
  variation: { range: (min: number, max: number) => ({ min, max }) },
}));

const motion = (reduce: boolean) =>
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: reduce && query.includes('reduce') }),
  });

describe('Celebration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    confetti.mockClear();
    motion(false);
  });
  afterEach(() => vi.useRealTimers());

  it('bursts at once and repeats until stopped, once at a time', async () => {
    const c = TestBed.inject(Celebration);
    c.start();
    c.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(confetti).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(BURST_INTERVAL_MS);
    expect(confetti).toHaveBeenCalledTimes(6);
    c.stop();
    await vi.advanceTimersByTimeAsync(BURST_INTERVAL_MS * 2);
    expect(confetti).toHaveBeenCalledTimes(6);
  });

  it('does nothing under reduced motion', async () => {
    motion(true);
    TestBed.inject(Celebration).start();
    await vi.advanceTimersByTimeAsync(BURST_INTERVAL_MS);
    expect(confetti).not.toHaveBeenCalled();
  });
});
