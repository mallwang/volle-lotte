import { buildDeck, drawCard } from './cards.js';
import { seededRandomInt } from './rng.js';
import { defaultRules } from './types.js';
import type { CardType } from './types.js';

const count = (deck: readonly CardType[], card: CardType) => deck.filter((c) => c === card).length;

describe('cards', () => {
  it('default deck has 56 cards with the default counts', () => {
    const deck = buildDeck(defaultRules(), seededRandomInt(1));
    expect(deck).toHaveLength(56);
    expect(count(deck, 'fireworks')).toBe(5);
    expect(count(deck, 'stop')).toBe(10);
    expect(count(deck, 'clover')).toBe(1);
  });

  it('custom counts give exactly those counts', () => {
    const rules = {
      ...defaultRules(),
      cardCounts: { ...defaultRules().cardCounts, stop: 0, clover: 3 },
    };
    const deck = buildDeck(rules, seededRandomInt(1));
    expect(count(deck, 'stop')).toBe(0);
    expect(count(deck, 'clover')).toBe(3);
    expect(deck).toHaveLength(56 - 10 - 1 + 3);
  });

  it('draw pops the last element and does not mutate the deck', () => {
    const deck: CardType[] = ['stop', 'street', 'clover'];
    const drawn = drawCard(deck, defaultRules(), seededRandomInt(1));
    expect(drawn).toEqual({ card: 'clover', deck: ['stop', 'street'], reshuffled: false });
    expect(deck).toHaveLength(3);
  });

  // ported from Java SpielTest.deckReshufflesWhenEmpty (56 cards instead of 50)
  it('reshuffles from the full set when empty, repeatedly', () => {
    const rng = seededRandomInt(7);
    let deck: CardType[] = [];
    let reshuffles = 0;
    for (let i = 0; i < 120; i++) {
      const drawn = drawCard(deck, defaultRules(), rng);
      if (drawn.reshuffled) reshuffles++;
      deck = drawn.deck;
    }
    expect(reshuffles).toBe(3); // draws 1, 57 and 113
  });
});
