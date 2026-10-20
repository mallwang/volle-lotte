import { TestBed } from '@angular/core/testing';
import { countdownDelays, Sounds } from './sounds';

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

describe('Sounds', () => {
  beforeEach(() => {
    vi.stubGlobal('Audio', FakeAudio);
    audios.length = 0;
    play.mockReset().mockResolvedValue();
    pause.mockClear();
    load.mockClear();
    localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  const create = () => TestBed.inject(Sounds);

  it('is not muted by default', () => {
    expect(create().muted()).toBe(false);
  });

  it('starts muted when the device remembers it', () => {
    localStorage.setItem('vl-muted', 'true');
    expect(create().muted()).toBe(true);
  });

  it('toggles, stores the choice and silences playing cues', () => {
    const sounds = create();
    sounds.play('victory');
    audios[0].currentTime = 4;
    sounds.toggle();
    expect(sounds.muted()).toBe(true);
    expect(localStorage.getItem('vl-muted')).toBe('true');
    expect(pause).toHaveBeenCalledTimes(1);
    expect(audios[0].currentTime).toBe(0);
    sounds.toggle();
    expect(sounds.muted()).toBe(false);
    expect(localStorage.getItem('vl-muted')).toBe('false');
  });

  it('still toggles in memory when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const sounds = create();
    expect(sounds.muted()).toBe(false);
    sounds.toggle();
    expect(sounds.muted()).toBe(true);
  });

  it('plays nothing while muted', () => {
    localStorage.setItem('vl-muted', 'true');
    create().play('your-turn');
    expect(audios).toHaveLength(0);
    expect(play).not.toHaveBeenCalled();
  });

  it('swallows a play() the browser rejects', async () => {
    play.mockRejectedValue(new DOMException('blocked', 'NotAllowedError'));
    create().play('your-turn');
    await Promise.resolve();
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('rewinds and reuses one element when a cue plays twice', () => {
    const sounds = create();
    sounds.play('countdown');
    audios[0].currentTime = 0.5;
    sounds.play('countdown');
    expect(audios).toHaveLength(1);
    expect(audios[0].currentTime).toBe(0);
    expect(play).toHaveBeenCalledTimes(2);
  });

  it('gives every cue its own file', () => {
    const sounds = create();
    (
      [
        'victory',
        'game-start',
        'your-turn',
        'countdown',
        'volle-lotte',
        'points',
        'defeat',
      ] as const
    ).forEach((cue) => sounds.play(cue));
    expect(audios.map((a) => a.src)).toEqual([
      'sounds/victory.mp3',
      'sounds/game-start.mp3',
      'sounds/your-turn.mp3',
      'sounds/countdown.mp3',
      'sounds/volle-lotte.mp3',
      'sounds/points.mp3',
      'sounds/defeat.mp3',
    ]);
  });

  it('preloads each element once without playing', () => {
    const sounds = create();
    sounds.preload();
    sounds.preload();
    expect(audios).toHaveLength(7);
    expect(audios.every((a) => a.preload === 'auto')).toBe(true);
    expect(load).toHaveBeenCalledTimes(7);
    expect(play).not.toHaveBeenCalled();
  });

  it('stops a cue that never played without error', () => {
    create().stop('victory');
    expect(pause).not.toHaveBeenCalled();
  });
});

describe('countdownDelays', () => {
  it('beeps once per second in the last five seconds', () => {
    expect(countdownDelays(30_000, 0)).toEqual([25_000, 26_000, 27_000, 28_000, 29_000]);
  });

  it('skips beeps that already lie in the past', () => {
    expect(countdownDelays(3_500, 0)).toEqual([500, 1_500, 2_500]);
  });

  it('starts at once when the deadline is exactly five seconds ahead', () => {
    const delays = countdownDelays(5_000, 0);
    expect(delays).toHaveLength(5);
    expect(delays[0]).toBe(0);
  });

  it('gives nothing for a deadline in the past', () => {
    expect(countdownDelays(0, 1)).toEqual([]);
  });
});
