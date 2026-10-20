import { TestBed } from '@angular/core/testing';
import { BURST_INTERVAL_MS, Celebration } from './celebration';
import { Sounds } from './sounds';

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

const play = vi.fn<() => Promise<void>>();
const pause = vi.fn();
const load = vi.fn();
class FakeAudio {
  preload = '';
  currentTime = 0;
  constructor(readonly src: string) {
    audios.push(this);
  }
  play = play;
  pause = pause;
  load = load;
}
const audios: FakeAudio[] = [];

describe('Celebration', () => {
  beforeEach(() => {
    vi.stubGlobal('Audio', FakeAudio);
    audios.length = 0;
    play.mockReset().mockResolvedValue();
    pause.mockClear();
    load.mockClear();
    localStorage.clear();
    vi.useFakeTimers();
    confetti.mockClear();
    motion(false);
    visibility('visible');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
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
    expect(audios).toHaveLength(1);
    celebration.stop();
    celebration.stop();
  });

  it('plays the victory sound once, not with every burst, and stops it with the celebration', async () => {
    const celebration = TestBed.inject(Celebration);
    celebration.start();
    await vi.advanceTimersByTimeAsync(BURST_INTERVAL_MS * 3);
    expect(audios).toHaveLength(1);
    expect(audios[0].src).toBe('sounds/victory.mp3');
    expect(play).toHaveBeenCalledTimes(1);
    celebration.stop();
    expect(pause).toHaveBeenCalledTimes(1);
  });

  it('preloads the sounds and the confetti library ahead of the celebration', async () => {
    const celebration = TestBed.inject(Celebration);
    celebration.preload();
    celebration.preload();
    expect(audios).toHaveLength(5);
    expect(audios.every((a) => a.preload === 'auto')).toBe(true);
    expect(load).toHaveBeenCalledTimes(5);
    expect(play).not.toHaveBeenCalled();
    celebration.start();
    expect(audios).toHaveLength(5);
    expect(play).toHaveBeenCalledTimes(1);
    celebration.stop();
  });

  it('plays no sound while muted but still bursts confetti', async () => {
    TestBed.inject(Sounds).toggle();
    const celebration = TestBed.inject(Celebration);
    celebration.start();
    await flush();
    expect(play).not.toHaveBeenCalled();
    expect(confetti).toHaveBeenCalledTimes(3);
    celebration.stop();
    TestBed.inject(Sounds).toggle();
  });

  it('plays the preloaded sound again from the start in a later celebration', () => {
    const celebration = TestBed.inject(Celebration);
    celebration.start();
    audios[0].currentTime = 4;
    celebration.stop();
    expect(audios[0].currentTime).toBe(0);
    celebration.start();
    expect(audios).toHaveLength(1);
    expect(play).toHaveBeenCalledTimes(2);
    celebration.stop();
  });

  it('survives a browser that blocks the sound', async () => {
    play.mockRejectedValue(new DOMException('blocked', 'NotAllowedError'));
    const celebration = TestBed.inject(Celebration);
    celebration.start();
    await flush();
    expect(confetti).toHaveBeenCalledTimes(3);
    celebration.stop();
  });

  it('skips the confetti but keeps the sound when the system asks for reduced motion', async () => {
    motion(true);
    const celebration = TestBed.inject(Celebration);
    celebration.start();
    await vi.advanceTimersByTimeAsync(BURST_INTERVAL_MS * 2);
    expect(confetti).not.toHaveBeenCalled();
    expect(play).toHaveBeenCalledTimes(1);
    celebration.stop();
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
