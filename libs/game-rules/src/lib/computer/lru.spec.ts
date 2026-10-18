import { Lru } from './lru.js';

describe('Lru', () => {
  it('evicts the least recently used entry and never exceeds the maximum', () => {
    const lru = new Lru<string, number>(2);
    lru.set('a', 1);
    lru.set('b', 2);
    expect(lru.get('a')).toBe(1); // a is now the most recent
    lru.set('c', 3);
    expect(lru.size).toBe(2);
    expect(lru.get('b')).toBeUndefined();
    expect(lru.get('a')).toBe(1);
    expect(lru.get('c')).toBe(3);
  });

  it('overwrites an existing key without growing', () => {
    const lru = new Lru<string, number>(2);
    const key = 'a';
    for (const value of [1, 2]) lru.set(key, value);
    expect(lru.size).toBe(1);
    expect(lru.get(key)).toBe(2);
  });
});
