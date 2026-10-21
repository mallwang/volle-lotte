import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';
/** Same key as the desktop client, so the choice carries over. */
export const THEME_KEY = 'vl-theme';

@Injectable({ providedIn: 'root' })
export class MobileThemeService {
  private readonly doc = inject(DOCUMENT);
  /** The stored choice, else the device preference. */
  readonly mode = signal<ThemeMode>(this.read());

  constructor() {
    effect(() => (this.doc.documentElement.dataset['theme'] = this.mode()));
  }

  toggle(): void {
    const mode = this.mode() === 'dark' ? 'light' : 'dark';
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
      if (v === 'light' || v === 'dark') return v;
    } catch {
      // fall through to the device preference
    }
    return this.doc.defaultView?.matchMedia?.('(prefers-color-scheme: dark)')?.matches
      ? 'dark'
      : 'light';
  }
}
