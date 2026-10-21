import { Injectable } from '@angular/core';

/** Pause between two rounds of bursts while a celebration runs. */
export const BURST_INTERVAL_MS = 3000;
const BURSTS_PER_ROUND = 3;
const CONFETTI_COUNT = 50;

const reducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Confetti for the game-over dialog; party-js loads only when a celebration starts. No sound on the phone. */
@Injectable({ providedIn: 'root' })
export class Celebration {
  private timer?: ReturnType<typeof setInterval>;

  /** Starts the repeating bursts; no-op while one runs or under reduced motion. */
  start(): void {
    if (this.timer || reducedMotion()) return;
    void this.burst();
    this.timer = setInterval(() => void this.burst(), BURST_INTERVAL_MS);
  }

  /** Stops the bursts; particles already in the air fall down by themselves. */
  stop(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }

  private async burst(): Promise<void> {
    if (document.visibilityState === 'hidden') return;
    const party = await import('party-js');
    if (!this.timer) return; // stopped while the library was loading
    const { innerWidth, innerHeight } = window;
    for (let i = 0; i < BURSTS_PER_ROUND; i++) {
      // cosmetic positions only
      // eslint-disable-next-line sonarjs/pseudo-random
      const [x, y] = [innerWidth * (0.15 + Math.random() * 0.7), innerHeight * 0.4];
      party.confetti(new party.Rect(x, y, 1, 1), {
        count: party.variation.range(CONFETTI_COUNT, CONFETTI_COUNT + 16),
        spread: party.variation.range(180, 360),
        speed: party.variation.range(250, 500),
        size: party.variation.range(0.6, 1),
      });
    }
  }
}
