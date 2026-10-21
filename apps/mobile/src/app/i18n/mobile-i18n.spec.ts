import { mobileDe } from './mobile-de';
import { mobileEn } from './mobile-en';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('mobile dictionaries', () => {
  it('have the same keys and placeholders', () => {
    expect(Object.keys(mobileDe).sort()).toEqual(Object.keys(mobileEn).sort());
    for (const [k, text] of Object.entries(mobileEn))
      expect(placeholders(mobileDe[k as keyof typeof mobileEn])).toEqual(placeholders(text));
  });
});
