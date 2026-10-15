import { shuffle } from './rng.js';
import { CARD_TYPES } from './types.js';
import type { CardType, RandomInt, Rules } from './types.js';

export function buildDeck(rules: Rules, rng: RandomInt): CardType[] {
  return shuffle(
    CARD_TYPES.flatMap((card) => Array<CardType>(rules.cardCounts[card]).fill(card)),
    rng,
  );
}

/** Pops the top card (last element); an empty deck is first rebuilt from the full configured set. */
export function drawCard(
  deck: readonly CardType[],
  rules: Rules,
  rng: RandomInt,
): { card: CardType; deck: CardType[]; reshuffled: boolean } {
  const reshuffled = deck.length === 0;
  const pile = reshuffled ? buildDeck(rules, rng) : [...deck];
  return { card: pile.pop() as CardType, deck: pile, reshuffled };
}
