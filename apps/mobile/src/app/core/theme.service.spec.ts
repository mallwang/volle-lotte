import { TestBed } from '@angular/core/testing';
import { MobileThemeService, THEME_KEY } from './theme.service';

describe('MobileThemeService', () => {
  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset['theme'];
  });

  it('starts from the stored choice and toggles, persists and applies it', () => {
    localStorage.setItem(THEME_KEY, 'dark');
    const theme = TestBed.inject(MobileThemeService);
    expect(theme.mode()).toBe('dark');
    theme.toggle();
    TestBed.tick();
    expect(theme.mode()).toBe('light');
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
    expect(document.documentElement.dataset['theme']).toBe('light');
  });

  it('falls back to the device preference when nothing is stored', () => {
    window.matchMedia = (() => ({ matches: true })) as unknown as typeof window.matchMedia;
    expect(TestBed.inject(MobileThemeService).mode()).toBe('dark');
  });
});
