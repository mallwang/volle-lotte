import type { ConcreteRisk } from './profile.js';

// ponytail: all numbers are tuned with the seeded tournaments (tournament.spec.ts); only the orderings are fixed by the spec.

/** Extra weight of a loss in the value of a bust: value(bust) = -kappa * points at stake. */
export const RISK_KAPPA: Record<ConcreteRisk, number> = { none: 1, medium: 0, high: -0.12 };

/** kappa is rounded to this grid so that tables can be shared between decisions. */
export const KAPPA_STEP = 0.05;
export const KAPPA_MIN = -0.5;
export const KAPPA_MAX = 2;

/** Run points are multiples of 50; tables are exact in the run and capped here (above, the computer banks when allowed). */
export const RUN_STEP = 50;
export const RUN_CAP = 4000;
/** Carried points are bucketed; above the cap the computer banks when allowed. */
export const CARRIED_STEP = 250;
export const CARRIED_CAP = 4000;

/** Share of the points assumed when a Volle Lotte on a Bonus card cannot be banked (minimum not reached) and a card must be drawn. */
export const FORCED_DRAW_FACTOR = 0.6;

/** Maximum number of memoised value tables / draw statistics. */
export const MAX_TABLES = 64;
export const MAX_STATS = 16;

/** Medium skill: softmax temperature in points; the lower, the closer to hard. */
export const MEDIUM_TEMPERATURE = 110;
/** Medium skill on special cards: chance to pick a random one among the all-dice selections. */
export const MEDIUM_SLIP = 0.2;

/** Draw decision: logistic scale = base + fraction * carried points. */
export const DRAW_SCALE_BASE = 60;
export const DRAW_SCALE_FRACTION = 0.1;
/** Risk high adds this many points of advantage to drawing. */
export const HIGH_DRAW_BIAS = 450;

/** Score situation: kappa shift. Behind the leader lowers it, being close to the target raises it. */
export const DEFICIT_GAIN = 0.3;
export const NEAR_TARGET_GAIN = 0.5;
export const NEAR_TARGET_FROM = 0.5;

/** Easy skill: bank from this many points per risk, and draw after a Bonus Volle Lotte below this total. */
export const EASY_BANK_AT: Record<ConcreteRisk, number> = { none: 200, medium: 300, high: 450 };
export const EASY_DRAW_BELOW: Record<ConcreteRisk, number> = { none: 0, medium: 700, high: 1500 };
