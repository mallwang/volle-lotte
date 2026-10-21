import { TestBed } from '@angular/core/testing';
import { defaultSetup, MAX_PRESETS, type Setup } from 'client-core';
import { SetupStore } from './setup-store';

const make = () => {
  TestBed.resetTestingModule();
  return TestBed.inject(SetupStore);
};
const custom: Setup = {
  ...defaultSetup(),
  seats: 6,
  computers: [{ seat: 2, difficulty: 'hard', risk: 'high' }],
};

describe('SetupStore', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('starts empty', () => {
    const store = make();
    expect(store.last()).toBeNull();
    expect(store.presets()).toEqual([]);
    expect(store.available()).toBe(true);
    expect(store.reference()).toBeNull();
  });

  it.each([
    ['invalid json', 'garbage'],
    ['an array', '[]'],
    ['a wrong version', JSON.stringify({ v: 2, setup: custom, items: [] })],
    ['no setup', JSON.stringify({ v: 1 })],
  ])('treats %s as no data', (_name, raw) => {
    localStorage.setItem('vl-last-setup', raw);
    localStorage.setItem('vl-presets', raw);
    const store = make();
    expect(store.last()).toBeNull();
    expect(store.presets()).toEqual([]);
  });

  it('keeps the last setup across instances', () => {
    make().saveLast(custom);
    expect(make().last()).toEqual(custom);
  });

  it('sanitises stored values', () => {
    localStorage.setItem('vl-last-setup', JSON.stringify({ v: 1, setup: { seats: 99, speed: 5 } }));
    expect(make().last()).toEqual({ ...defaultSetup(), speed: 5 });
  });

  it('cleans stored presets: bad names, duplicates and the limit', () => {
    const item = (name: unknown) => ({ name, setup: custom });
    const items = [
      item('Ok'),
      item('ok'),
      item(5),
      item('   '),
      item('x'.repeat(41)),
      null,
      ...Array.from({ length: 12 }, (_, i) => item(`P${i}`)),
    ];
    localStorage.setItem('vl-presets', JSON.stringify({ v: 1, items }));
    const names = make()
      .presets()
      .map((p) => p.name);
    expect(names).toHaveLength(MAX_PRESETS);
    expect(names.slice(0, 3)).toEqual(['Ok', 'P0', 'P1']);
  });

  describe('savePreset', () => {
    it('saves a snapshot, trims the name and persists it', () => {
      const store = make();
      expect(store.savePreset('  Friday  ', custom)).toBe('ok');
      expect(store.presets()).toEqual([{ name: 'Friday', setup: custom }]);
      expect(make().presets()).toEqual([{ name: 'Friday', setup: custom }]);
    });

    it.each(['', '   ', 'x'.repeat(41)])('rejects the name %j', (name) => {
      const store = make();
      expect(store.savePreset(name, custom)).toBe('name');
      expect(store.presets()).toEqual([]);
    });

    it('accepts exactly 40 characters', () => {
      expect(make().savePreset('x'.repeat(40), custom)).toBe('ok');
    });

    it('asks before replacing a name, ignoring case and spaces', () => {
      const store = make();
      store.savePreset('Friday', custom);
      expect(store.savePreset(' friday ', defaultSetup())).toBe('exists');
      expect(store.presets()[0].setup).toEqual(custom);
      expect(store.savePreset(' friday ', defaultSetup(), true)).toBe('ok');
      expect(store.presets()).toEqual([{ name: 'friday', setup: defaultSetup() }]);
    });

    it('refuses an eleventh preset but still replaces at the limit', () => {
      const store = make();
      for (let i = 0; i < MAX_PRESETS; i++) expect(store.savePreset(`P${i}`, custom)).toBe('ok');
      expect(store.savePreset('Extra', custom)).toBe('full');
      expect(store.savePreset('P3', defaultSetup(), true)).toBe('ok');
      expect(store.presets()).toHaveLength(MAX_PRESETS);
    });

    it('reports storage problems and keeps the value for this page load', () => {
      const store = make();
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota');
      });
      expect(store.savePreset('Friday', custom)).toBe('storage');
      expect(store.available()).toBe(false);
      expect(store.presets()).toHaveLength(1);
      expect(store.savePreset('Other', custom)).toBe('storage');
    });
  });

  it('deletes only the named preset and leaves the last setup alone', () => {
    const store = make();
    store.saveLast(custom);
    store.savePreset('A', custom);
    store.savePreset('B', custom);
    store.deletePreset(' a ');
    expect(store.presets().map((p) => p.name)).toEqual(['B']);
    expect(store.last()).toEqual(custom);
    expect(
      make()
        .presets()
        .map((p) => p.name),
    ).toEqual(['B']);
  });

  it('resets the last setup but keeps the presets', () => {
    const store = make();
    store.saveLast(custom);
    store.savePreset('A', custom);
    store.resetLast();
    expect(store.last()).toBeNull();
    expect(make().last()).toBeNull();
    expect(make().presets()).toHaveLength(1);
  });

  it('is unavailable when the browser blocks storage', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const store = make();
    expect(store.available()).toBe(false);
    store.saveLast(custom);
    expect(store.last()).toEqual(custom);
  });

  it('survives a throwing getItem and removeItem', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const store = make();
    expect(store.last()).toBeNull();
    store.resetLast();
    expect(store.available()).toBe(false);
  });

  it('tracks the reference setup in memory only', () => {
    const store = make();
    store.setReference(custom);
    expect(store.reference()).toEqual(custom);
    expect(localStorage).toHaveLength(0);
    store.setReference(null);
    expect(store.reference()).toBeNull();
  });

  it('never stores anything but the two keys', () => {
    const store = make();
    store.saveLast(custom);
    store.savePreset('A', custom);
    expect(Object.keys(localStorage).sort()).toEqual(['vl-last-setup', 'vl-presets']);
  });
});
