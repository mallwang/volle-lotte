import { TestBed } from '@angular/core/testing';
import { THEME_KEY, ThemeService } from './theme.service';

type Listener = (e: { matches: boolean }) => void;

function mockMatchMedia(matches: boolean) {
  let listener: Listener = (_e) => undefined;
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    addEventListener: (...args: [string, Listener]) => (listener = args[1]),
  });
  return (m: boolean) => listener({ matches: m });
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

  it('follows the system setting by default (dark and light)', () => {
    mockMatchMedia(true);
    expect(create().mode()).toBe('system');
    expect(isDark()).toBe(true);
    mockMatchMedia(false);
    create();
    expect(isDark()).toBe(false);
  });

  it('persists a manual override', () => {
    mockMatchMedia(true);
    const service = create();
    service.set('light');
    TestBed.tick();
    expect(isDark()).toBe(false);
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
    expect(create().mode()).toBe('light');
  });

  it('falls back to system for an invalid stored value', () => {
    mockMatchMedia(false);
    localStorage.setItem(THEME_KEY, 'purple');
    expect(create().mode()).toBe('system');
  });

  it('reacts to live OS changes while in system mode', () => {
    const change = mockMatchMedia(false);
    const service = create();
    change(true);
    TestBed.tick();
    expect(service.resolved()).toBe('dark');
    expect(isDark()).toBe(true);
  });

  it('uses light when matchMedia is unavailable', () => {
    (window as { matchMedia?: unknown }).matchMedia = undefined;
    const service = create();
    expect(service.resolved()).toBe('light');
    expect(isDark()).toBe(false);
  });
});
