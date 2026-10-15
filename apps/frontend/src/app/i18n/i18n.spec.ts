import { de } from './de';
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
});
