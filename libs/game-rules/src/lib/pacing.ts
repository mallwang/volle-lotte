/** Computer speed steps: 1 slowest, 5 fastest. */
export const COMPUTER_SPEEDS = [1, 2, 3, 4, 5] as const;
export const DEFAULT_SPEED = 3;

/** Waits (ms) between a computer's actions; client and server read the same table. */
export interface Pacing {
  /** Pause before an action and before applying a pick (also the pick highlight time). */
  pauseMs: number;
  /** Margin after a throw, added to the client's dice roll maximum. */
  afterRollMs: number;
  /** How long a turn result stays on the table before the next player may move. */
  noticeMs: number;
}

// step 2 equals the pacing before the speed setting existed
const TABLE: Record<number, Pacing> = {
  1: { pauseMs: 3000, afterRollMs: 4500, noticeMs: 8000 },
  2: { pauseMs: 2000, afterRollMs: 3250, noticeMs: 6000 },
  3: { pauseMs: 1200, afterRollMs: 1500, noticeMs: 3500 },
  4: { pauseMs: 700, afterRollMs: 800, noticeMs: 2500 },
  5: { pauseMs: 400, afterRollMs: 400, noticeMs: 1500 },
};

export const isComputerSpeed = (x: unknown): x is number =>
  typeof x === 'number' && Number.isInteger(x) && x >= 1 && x <= 5;

/** Any invalid step gets the default row. */
export const pacing = (step: unknown): Pacing =>
  TABLE[isComputerSpeed(step) ? step : DEFAULT_SPEED];
