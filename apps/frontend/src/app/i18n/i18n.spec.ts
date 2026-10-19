import { de } from './de';
import type { RejectionReason, RulesErrorCode } from 'game-rules';
import { en } from './en';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('dictionaries', () => {
  it('have the same keys', () => {
    expect(Object.keys(de).sort()).toEqual(Object.keys(en).sort());
  });

  it('have the same placeholders per key', () => {
    for (const [key, text] of Object.entries(en)) {
      expect(placeholders(de[key as keyof typeof en]), key).toEqual(placeholders(text));
    }
  });

  it('cover every rules error code and engine rejection', () => {
    const rules: Record<RulesErrorCode, true> = {
      notObject: true,
      targetScore: true,
      minimumPoints: true,
      doubling: true,
      cardCounts: true,
      cardCountValues: true,
      deckEmpty: true,
    };
    const engine: Record<RejectionReason, true> = {
      gameOver: true,
      wrongPhase: true,
      emptySelection: true,
      invalidIndex: true,
      duplicateIndex: true,
      nonScoringDie: true,
      belowMinimum: true,
      nothingToBank: true,
    };
    for (const k of Object.keys(rules)) expect(en, k).toHaveProperty(`rules.${k}`);
    for (const k of Object.keys(engine)) expect(en, k).toHaveProperty(`engine.${k}`);
  });
});

describe('computer name texts', () => {
  const keys = [
    'computerName.heading',
    'computerName.label',
    'computerName.save',
    'computerName.invalid',
    'computerName.taken',
    'log.renamed',
  ];

  it.each(keys)('%s exists in both languages and differs between them', (key) => {
    expect(en[key as keyof typeof en], key).toBeTruthy();
    expect(de[key as keyof typeof de], key).toBeTruthy();
    expect(de[key as keyof typeof de]).not.toBe(en[key as keyof typeof en]);
  });
});
