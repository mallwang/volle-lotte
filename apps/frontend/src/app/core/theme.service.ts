import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';

export type ThemeMode = 'system' | 'light' | 'dark';
/** localStorage key; keep in sync with the pre-paint script in index.html. */
export const THEME_KEY = 'vl-theme';
const MODES: readonly string[] = ['system', 'light', 'dark'];

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly query =
    this.doc.defaultView?.matchMedia?.('(prefers-color-scheme: dark)') ?? null;
  private readonly systemDark = signal(this.query?.matches ?? false);

  readonly mode = signal<ThemeMode>(this.read());
  readonly resolved = computed<'light' | 'dark'>(() => {
    const mode = this.mode();
    if (mode !== 'system') return mode;
    return this.systemDark() ? 'dark' : 'light';
  });

  constructor() {
    this.query?.addEventListener('change', (e) => this.systemDark.set(e.matches));
    effect(() => this.doc.documentElement.classList.toggle('app-dark', this.resolved() === 'dark'));
  }

  set(mode: ThemeMode): void {
    this.mode.set(mode);
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch {
      // storage unavailable: the choice only lasts for this page view
    }
  }

  private read(): ThemeMode {
    try {
      const v = localStorage.getItem(THEME_KEY);
      return v !== null && MODES.includes(v) ? (v as ThemeMode) : 'system';
    } catch {
      return 'system';
    }
  }
}
