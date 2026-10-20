import { Injectable, signal } from '@angular/core';

export type SoundCue = 'victory' | 'game-start' | 'your-turn' | 'countdown' | 'volle-lotte';

const CUES: readonly SoundCue[] = [
  'victory',
  'game-start',
  'your-turn',
  'countdown',
  'volle-lotte',
];
const path = (cue: SoundCue): string => `sounds/${cue}.mp3`;
const KEY = 'vl-muted';

/** Seconds before the deadline in which the countdown beeps. */
const COUNTDOWN_SECONDS = 10;

/**
 * Delays (ms from `now`) of the countdown beeps, one per second of the last ten before `at`;
 * beeps that would already lie in the past are left out. Ascending.
 */
export function countdownDelays(at: number, now: number): number[] {
  const delays: number[] = [];
  for (let s = COUNTDOWN_SECONDS; s >= 1; s--) {
    const delay = at - s * 1000 - now;
    if (delay >= 0) delays.push(delay);
  }
  return delays;
}

/**
 * Plays the game's sound cues, one audio element per cue, and owns the device-local mute setting
 * that silences all of them. Playback never fails loudly: browsers may refuse it before any user
 * interaction.
 */
@Injectable({ providedIn: 'root' })
export class Sounds {
  readonly muted = signal(read());
  private readonly elements = new Map<SoundCue, HTMLAudioElement>();

  toggle(): void {
    const muted = !this.muted();
    this.muted.set(muted);
    try {
      localStorage.setItem(KEY, String(muted));
    } catch {
      // storage blocked: the setting only lasts for this page load
    }
    if (muted) CUES.forEach((cue) => this.stop(cue));
  }

  /** Fetches every sound ahead of time. Safe to call repeatedly. */
  preload(): void {
    CUES.forEach((cue) => this.element(cue));
  }

  /** Plays the cue from the start; nothing happens while muted. */
  play(cue: SoundCue): void {
    if (this.muted()) return;
    const audio = this.element(cue);
    audio.currentTime = 0;
    audio.play().catch(() => undefined);
  }

  stop(cue: SoundCue): void {
    const audio = this.elements.get(cue);
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }

  private element(cue: SoundCue): HTMLAudioElement {
    let audio = this.elements.get(cue);
    if (!audio) {
      audio = new Audio(path(cue));
      audio.preload = 'auto';
      audio.load();
      this.elements.set(cue, audio);
    }
    return audio;
  }
}

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === 'true';
  } catch {
    return false;
  }
}
