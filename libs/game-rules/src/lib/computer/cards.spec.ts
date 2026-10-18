import { CARD_TYPES } from '../types.js';
import type { CardType } from '../types.js';
import { allDiceStats, streetChance } from './odds.js';
import { cardShares, drawValue } from './cards.js';
import { situation } from './testing.js';

const only = (card: CardType, count = 10) =>
  Object.fromEntries(CARD_TYPES.map((c) => [c, c === card ? count : 0])) as Record<
    CardType,
    number
  >;
const state = (card: CardType, extra: Parameters<typeof situation>[1] = {}) =>
  situation({ run: 1000, free: 0 }, { ...extra, cardCounts: only(card) });

describe('cardShares', () => {
  it('are the configured counts, normalised', () => {
    const shares = cardShares(situation({}).rules.cardCounts);
    expect(Object.values(shares).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(shares.stop).toBeCloseTo(10 / 56, 12);
  });

  it('are zero for an empty deck', () => {
    expect(cardShares(only('stop', 0)).stop).toBe(0);
  });
});

describe('drawValue per card type', () => {
  const stake = 1000;
  it('Stop loses the carried points', () => {
    expect(drawValue(state('stop'), stake, 0)).toBe(0);
    expect(drawValue(state('stop'), stake, 1)).toBe(-stake);
  });

  it('Star cannot lose', () => {
    const star = drawValue(state('star'), stake, 5);
    expect(star).toBeCloseTo(stake + allDiceStats(true).endRun, 9);
    expect(star).toBeGreaterThan(stake);
  });

  it('Plus/Minus yields only 1,000 on a Volle Lotte and loses the rest', () => {
    const p = allDiceStats(true).volleLotte;
    const v = drawValue(state('plusMinus'), stake, 0);
    expect(v).toBeCloseTo(p * 1000, 9);
    expect(v).toBeLessThan(stake);
  });

  it('Street pays 2,000 with the street chance', () => {
    expect(drawValue(state('street'), stake, 0)).toBeCloseTo(streetChance() * 2000, 9);
  });

  it('Clover can win the game: worth the distance to the target', () => {
    const near = state('clover', { scores: [5500, 0] });
    const far = state('clover', { scores: [0, 0] });
    expect(drawValue(far, stake, 0)).toBeGreaterThan(drawValue(near, stake, 0));
  });

  it('Double Lotte doubles the run on a Volle Lotte', () => {
    const v = drawValue(state('doubleLotte'), stake, 0);
    const s = allDiceStats(true);
    const expected = s.volleLotteRuns.reduce(
      (sum, [run, p]) => sum + p * (run * 2 >= 350 ? stake + run * 2 : 0),
      0,
    );
    expect(v).toBeCloseTo(expected, 9);
  });

  it('a Bonus card is valued by the run table, losing everything on a bust', () => {
    const lowRisk = drawValue(state('bonus400'), stake, 0);
    const highRisk = drawValue(state('bonus400'), stake, 1);
    expect(highRisk).toBeLessThan(lowRisk);
  });

  it('does not depend on the real order of the draw pile', () => {
    const s = situation({ run: 1000, free: 0 });
    const reversed = { ...s, deck: [...s.deck].reverse() };
    expect(drawValue(reversed, stake, 0)).toBe(drawValue(s, stake, 0));
  });

  it('is finite for a deck of only Stop cards', () => {
    expect(Number.isFinite(drawValue(state('stop'), stake, 0))).toBe(true);
  });
});
