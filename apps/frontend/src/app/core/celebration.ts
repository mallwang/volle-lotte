import { Injectable } from '@angular/core';

/** Pause between two rounds of bursts while a celebration runs. */
export const BURST_INTERVAL_MS = 3000;
const BURSTS_PER_ROUND = 3;
const CONFETTI_COUNT = 70;
const VICTORY_SOUND = 'sounds/victory.mp3';

const reducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Fireworks-style confetti over the whole screen, for screens that celebrate something (the
 * game-over modal today, the starting-player draw later). Based on the ReAIity Guesser confetti
 * (party-js), which is only loaded when a celebration actually starts. The victory sound plays
 * once per celebration, while the confetti repeats.
 */
@Injectable({ providedIn: 'root' })
export class Celebration {
  private timer?: ReturnType<typeof setInterval>;
  private sound?: HTMLAudioElement;
  private running = false;

  /**
   * Fetches the victory sound and the confetti library ahead of time, so a slow network cannot
   * delay the celebration once the game is won. Safe to call repeatedly.
   */
  preload(): void {
    this.audio();
    if (!reducedMotion()) import('party-js').catch(() => undefined);
  }

  /**
   * Plays the victory sound once and starts the repeating bursts; nothing happens if a celebration
   * runs already. Reduced motion only suppresses the confetti, not the sound.
   */
  start(): void {
    if (this.running) return;
    this.running = true;
    // the browser may refuse to play before any user interaction; the confetti still works then
    this.audio()
      .play()
      .catch(() => undefined);
    if (reducedMotion()) return;
    void this.burst();
    this.timer = setInterval(() => void this.burst(), BURST_INTERVAL_MS);
  }

  /** Stops the sound and the bursts; particles already in the air fall down by themselves. */
  stop(): void {
    this.running = false;
    clearInterval(this.timer);
    this.timer = undefined;
    if (this.sound) {
      this.sound.pause();
      this.sound.currentTime = 0;
    }
  }

  private audio(): HTMLAudioElement {
    if (!this.sound) {
      this.sound = new Audio(VICTORY_SOUND);
      this.sound.preload = 'auto';
      this.sound.load();
    }
    return this.sound;
  }

  private async burst(): Promise<void> {
    if (document.visibilityState === 'hidden') return;
    const party = await import('party-js');
    // stopped while the library was loading
    if (!this.timer) return;
    const { innerWidth, innerHeight, scrollX, scrollY } = window;
    for (let i = 0; i < BURSTS_PER_ROUND; i++) {
      // cosmetic positions only
      /* eslint-disable sonarjs/pseudo-random */
      const x = scrollX + innerWidth * (0.15 + Math.random() * 0.7);
      const y = scrollY + innerHeight * (0.2 + Math.random() * 0.3);
      /* eslint-enable sonarjs/pseudo-random */
      party.confetti(new party.Rect(x, y, 1, 1), {
        count: party.variation.range(CONFETTI_COUNT, CONFETTI_COUNT + 16),
        spread: party.variation.range(180, 360),
        speed: party.variation.range(300, 650),
        size: party.variation.range(0.65, 1.15),
      });
    }
  }
}
