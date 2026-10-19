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
    value: (query: string) => ({ matches: reduce && query.includes('reduce') }),
  });
const visibility = (state: DocumentVisibilityState) =>
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state);

describe('Celebration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    confetti.mockClear();
    motion(false);
    visibility('visible');
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    Reflect.deleteProperty(window, 'matchMedia');
  });

  const flush = () => vi.advanceTimersByTimeAsync(0);

  it('bursts at once and repeats until stopped', async () => {
    const celebration = TestBed.inject(Celebration);
    celebration.start();
    await flush();
    expect(confetti).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(BURST_INTERVAL_MS);
    expect(confetti).toHaveBeenCalledTimes(6);
    celebration.stop();
    await vi.advanceTimersByTimeAsync(BURST_INTERVAL_MS * 3);
    expect(confetti).toHaveBeenCalledTimes(6);
  });

  it('is idempotent', async () => {
    const celebration = TestBed.inject(Celebration);
    celebration.start();
    celebration.start();
    await flush();
    expect(confetti).toHaveBeenCalledTimes(3);
    celebration.stop();
    celebration.stop();
  });

  it('does nothing when the system asks for reduced motion', async () => {
    motion(true);
    const celebration = TestBed.inject(Celebration);
    celebration.start();
    await vi.advanceTimersByTimeAsync(BURST_INTERVAL_MS * 2);
    expect(confetti).not.toHaveBeenCalled();
  });

  it('skips bursts while the page is hidden', async () => {
    visibility('hidden');
    const celebration = TestBed.inject(Celebration);
    celebration.start();
    await vi.advanceTimersByTimeAsync(BURST_INTERVAL_MS);
    expect(confetti).not.toHaveBeenCalled();
    celebration.stop();
  });

  it('does not burst when stopped while the library loads', async () => {
    const celebration = TestBed.inject(Celebration);
    celebration.start();
    celebration.stop();
    await flush();
    expect(confetti).not.toHaveBeenCalled();
  });
});
