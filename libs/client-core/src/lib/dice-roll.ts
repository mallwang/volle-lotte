import { computed, signal } from '@angular/core';

/** Independent random duration in ms (inclusive range) for each of `n` dice. */
export function rollDurations(
  n: number,
  [min, max]: readonly [number, number],
  rand: () => number = Math.random,
): number[] {
  return Array.from({ length: n }, () => min + Math.floor(rand() * (max - min + 1)));
}

const NORMAL: [number, number] = [1000, 3000];
const FAST: [number, number] = [500, 1500];
const SWAP_MS = 120;

/**
 * Client-only dice roll: delays the reveal of the server's values, never changes them.
 * Each die has its own deadline; `rolling` is true until the last one has stopped.
 * Undecorated so this library stays free of DI; each app provides it via a tiny `@Injectable` subclass.
 */
export class DiceRoll {
  /** Per die of the current roll: has it stopped? */
  private readonly stopped = signal<boolean[]>([]);
  /** Bumped by the shared timer so rolling faces change. */
  private readonly tick = signal(0);
  private timers: ReturnType<typeof setTimeout>[] = [];
  private swap?: ReturnType<typeof setInterval>;
  /** Roll without spinning: dice stay blank until the roll is over. */
  private blank = false;

  readonly rolling = computed(() => this.stopped().some((s) => !s));

  /** Start rolling `count` dice; a running roll is finished first. Skip = no roll at all. */
  start(
    count: number,
    opts: { computerFast?: boolean; skip?: boolean; blank?: boolean } = {},
  ): void {
    this.finish();
    if ((opts.skip && !opts.blank) || count === 0) return;
    this.blank = !!opts.skip;
    const durations = rollDurations(count, opts.computerFast ? FAST : NORMAL);
    this.stopped.set(durations.map(() => false));
    this.swap = setInterval(() => this.tick.update((t) => t + 1), SWAP_MS);
    this.timers = durations.map((ms, i) =>
      setTimeout(() => {
        this.stopped.update((s) => s.map((v, j) => v || j === i));
        if (!this.rolling()) this.finish();
      }, ms),
    );
  }

  /** Is die `i` of the current throw still rolling? */
  isRolling(i: number): boolean {
    return !this.blank && this.stopped()[i] === false;
  }

  /** Face to draw: a random one while rolling, otherwise the server value. */
  faceFor(i: number, value: number | null): number | null {
    if (this.blank && this.stopped()[i] === false) return null;
    if (!this.isRolling(i)) return value;
    this.tick();
    // cosmetic face only; the final value always comes from the server
    // eslint-disable-next-line sonarjs/pseudo-random
    return 1 + Math.floor(Math.random() * 6);
  }

  private finish(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    clearInterval(this.swap);
    this.stopped.set([]);
    this.blank = false;
  }
}
