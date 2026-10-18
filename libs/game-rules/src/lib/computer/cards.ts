import type { CardType, GameState } from '../types.js';
import { CARD_TYPES } from '../types.js';
import { CARRIED_CAP } from './constants.js';
import { allDiceStats, streetChance } from './odds.js';
import { tableFor } from './value.js';

const PLUS_MINUS = 1000;
const STREET_POINTS = 2000;
const BONUS_CARDS = ['bonus200', 'bonus300', 'bonus400', 'bonus500', 'bonus600'] as const;

/** Share of each card type in the configured deck; never the real order of the draw pile. */
export function cardShares(counts: Readonly<Record<CardType, number>>): Record<CardType, number> {
  const total = CARD_TYPES.reduce((sum, c) => sum + counts[c], 0);
  return Object.fromEntries(
    CARD_TYPES.map((c) => [c, total === 0 ? 0 : counts[c] / total]),
  ) as Record<CardType, number>;
}

/** Average bonus of the Bonus cards in the deck, rounded to the table grid. */
export function averageBonus(counts: Readonly<Record<CardType, number>>): number {
  const n = BONUS_CARDS.reduce((sum, c) => sum + counts[c], 0);
  if (n === 0) return 400;
  const mean = BONUS_CARDS.reduce((sum, c) => sum + counts[c] * Number(c.slice(5)), 0) / n;
  return Math.round(mean / 50) * 50;
}

/**
 * Expected final points of drawing a new card with `carried` points at stake (banking yields `carried`).
 * Uses only the configured card counts and the exact odds, so no hidden information.
 */
export function drawValue(state: GameState, carried: number, kappa: number): number {
  const { rules } = state;
  const share = cardShares(rules.cardCounts);
  const stats = allDiceStats(rules.fourOfAKindDoubling);
  const lose = -kappa * carried;
  const pVL = stats.volleLotte;
  const bustLoss = stats.bust * lose - kappa * stats.bustRun;
  const me = state.players[state.current]?.score ?? 0;
  const win = Math.max(carried, rules.targetScore - me);

  const bonusShare = BONUS_CARDS.reduce((sum, c) => sum + share[c], 0);
  const bonus =
    bonusShare === 0
      ? 0
      : tableFor(
          rules,
          'bonus',
          Math.min(carried, CARRIED_CAP),
          averageBonus(rules.cardCounts),
          kappa,
        ).value(6, 0);

  const doubleLotte =
    stats.volleLotteRuns.reduce(
      (sum, [run, p]) => sum + p * (run * 2 >= rules.minimumPoints ? carried + run * 2 : lose),
      0,
    ) + bustLoss;
  const plusMinus = pVL * PLUS_MINUS + bustLoss;
  const clover = pVL * pVL * win + (1 - pVL * pVL) * lose;
  const street = streetChance() * STREET_POINTS + (1 - streetChance()) * lose;

  return (
    bonusShare * bonus +
    share.stop * lose +
    share.star * (carried + stats.endRun) +
    share.doubleLotte * doubleLotte +
    share.plusMinus * plusMinus +
    share.clover * clover +
    share.street * street
  );
}
