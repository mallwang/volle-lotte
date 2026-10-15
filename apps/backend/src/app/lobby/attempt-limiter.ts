const MAX_FAILURES = 5;
const WINDOW_MS = 10 * 60_000;
const LOCK_MS = 10 * 60_000;

interface Entry {
  failures: number[];
  lockedUntil: number;
}

/** 5 failures within 10 minutes per clientKey+gameId lock for 10 minutes; success clears. */
export class AttemptLimiter {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly now: () => number = Date.now) {}

  /** Remaining lock time in ms, 0 when attempts are allowed. */
  retryAfterMs(clientKey: string, gameId: string): number {
    const entry = this.entries.get(this.key(clientKey, gameId));
    return entry ? Math.max(0, entry.lockedUntil - this.now()) : 0;
  }

  /** Records a failure and returns the attempts left before the lock. */
  fail(clientKey: string, gameId: string): number {
    const key = this.key(clientKey, gameId);
    const now = this.now();
    const entry = this.entries.get(key) ?? { failures: [], lockedUntil: 0 };
    entry.failures = [...entry.failures.filter((t) => now - t < WINDOW_MS), now];
    if (entry.failures.length >= MAX_FAILURES) entry.lockedUntil = now + LOCK_MS;
    this.entries.set(key, entry);
    return Math.max(0, MAX_FAILURES - entry.failures.length);
  }

  succeed(clientKey: string, gameId: string): void {
    this.entries.delete(this.key(clientKey, gameId));
  }

  /** Drops entries of a removed game. */
  forgetGame(gameId: string): void {
    for (const key of this.entries.keys())
      if (key.endsWith(`\0${gameId}`)) this.entries.delete(key);
  }

  private key(clientKey: string, gameId: string): string {
    return `${clientKey}\0${gameId}`;
  }
}
