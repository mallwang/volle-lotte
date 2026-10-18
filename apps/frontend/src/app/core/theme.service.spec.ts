import { TestBed } from '@angular/core/testing';
import { THEME_KEY, ThemeService } from './theme.service';

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches });
}

function create(): ThemeService {
  TestBed.resetTestingModule();
  const service = TestBed.inject(ThemeService);
  TestBed.tick();
  return service;
}

const isDark = () => document.documentElement.classList.contains('app-dark');

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('app-dark');
  });

  it('starts from the device preference without storing it', () => {
    mockMatchMedia(true);
    expect(create().mode()).toBe('dark');
    expect(isDark()).toBe(true);
    mockMatchMedia(false);
    expect(create().mode()).toBe('light');
    expect(isDark()).toBe(false);
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
  });

  it('toggle() flips the mode and persists it', () => {
    mockMatchMedia(true);
    const service = create();
    service.toggle();
    TestBed.tick();
    expect(service.mode()).toBe('light');
    expect(isDark()).toBe(false);
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
    service.toggle();
    expect(service.mode()).toBe('dark');
  });

  it('a stored choice wins over the device preference', () => {
    mockMatchMedia(true);
    localStorage.setItem(THEME_KEY, 'light');
    expect(create().mode()).toBe('light');
    mockMatchMedia(false);
    localStorage.setItem(THEME_KEY, 'dark');
    expect(create().mode()).toBe('dark');
  });

  it.each(['system', 'purple'])('ignores the stored value "%s"', (value) => {
    mockMatchMedia(true);
    localStorage.setItem(THEME_KEY, value);
    expect(create().mode()).toBe('dark');
  });

  it('uses light when matchMedia is unavailable', () => {
    (window as { matchMedia?: unknown }).matchMedia = undefined;
    expect(create().mode()).toBe('light');
  });

  it('does not throw when storage fails', () => {
    mockMatchMedia(false);
    const service = create();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(() => service.toggle()).not.toThrow();
    expect(service.mode()).toBe('dark');
    vi.restoreAllMocks();
  });
});
