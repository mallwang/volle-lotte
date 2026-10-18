import type { Rules } from '../types.js';
import { averageBonus } from './cards.js';
import { allDiceStats, outcomes, streetChance } from './odds.js';
import { tableFor } from './value.js';

/** Builds the shared odds and the default value tables once (call at server start) so the first real decision is cheap. */
export function warmUp(rules: Rules): void {
  for (const doubling of [true, false]) {
    for (let n = 1; n <= 6; n++) outcomes(n, doubling);
    allDiceStats(doubling);
  }
  streetChance();
  tableFor(rules, 'bonus', 0, averageBonus(rules.cardCounts), 0).value(6, 0);
}
