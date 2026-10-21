import { TestBed } from '@angular/core/testing';
import { LANGUAGE_KEY, MobileI18nService } from './i18n.service';

describe('MobileI18nService', () => {
  afterEach(() => localStorage.clear());

  it('uses the stored language, persists changes and falls back to the key', () => {
    localStorage.setItem(LANGUAGE_KEY, 'de');
    const i18n = TestBed.inject(MobileI18nService);
    expect(i18n.lang()).toBe('de');
    i18n.set('en');
    expect(localStorage.getItem(LANGUAGE_KEY)).toBe('en');
    expect(i18n.t('no.such.key')).toBe('no.such.key');
  });

  it('follows the browser language without a stored choice', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('de-AT');
    expect(TestBed.inject(MobileI18nService).lang()).toBe('de');
  });
});
