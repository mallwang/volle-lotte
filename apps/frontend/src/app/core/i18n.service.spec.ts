import { TestBed } from '@angular/core/testing';
import { I18nService, LANGUAGE_KEY } from './i18n.service';

function create(browser: string[] = ['en-US']): I18nService {
  vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(browser);
  TestBed.resetTestingModule();
  const service = TestBed.inject(I18nService);
  TestBed.tick();
  return service;
}

describe('I18nService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('interpolates params and falls back to the key for unknown keys', () => {
    const s = create();
    expect(s.t('error.lockedRetry', { seconds: 7 })).toContain('7');
    expect(s.t('no.such.key')).toBe('no.such.key');
  });

  it('translates after a switch', () => {
    const s = create();
    const en = s.t('nav.games');
    s.set('de');
    expect(s.t('nav.games')).not.toBe(en);
  });

  it('detects the browser language (region stripped, list order, unsupported → en)', () => {
    expect(create(['de-AT']).lang()).toBe('de');
    expect(create(['fr', 'de']).lang()).toBe('de');
    expect(create(['fr']).lang()).toBe('en');
  });

  it('updates <html lang>, persists the choice and ignores unsupported codes', () => {
    const s = create();
    s.set('de');
    TestBed.tick();
    expect(document.documentElement.lang).toBe('de');
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe('de');
    s.set('xx');
    expect(s.lang()).toBe('de');
  });

  it('prefers the stored language over the browser and ignores invalid values', () => {
    localStorage.setItem(LANGUAGE_KEY, 'en');
    expect(create(['de']).lang()).toBe('en');
    localStorage.setItem(LANGUAGE_KEY, 'xx');
    expect(create(['de']).lang()).toBe('de');
  });

  it('survives unavailable storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const s = create(['de']);
    expect(s.lang()).toBe('de');
    s.set('en');
    expect(s.lang()).toBe('en');
  });
});
