import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';
/** localStorage key; keep in sync with the pre-paint script in index.html. */
export const THEME_KEY = 'vl-theme';
const MODES: ReadonlySet<string> = new Set<ThemeMode>(['light', 'dark']);

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);

  /** The stored choice, else the device preference read once; nothing is stored until a toggle. */
  readonly mode = signal<ThemeMode>(this.read());

  constructor() {
    effect(() => this.doc.documentElement.classList.toggle('app-dark', this.mode() === 'dark'));
  }

  set(mode: ThemeMode): void {
    this.mode.set(mode);
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch {
      // storage unavailable: the choice only lasts for this page view
    }
  }

  toggle(): void {
    this.set(this.mode() === 'dark' ? 'light' : 'dark');
  }

  private read(): ThemeMode {
    try {
      const v = localStorage.getItem(THEME_KEY);
      if (v !== null && MODES.has(v)) return v as ThemeMode;
    } catch {
      // fall through to the device preference
    }
    return this.doc.defaultView?.matchMedia?.('(prefers-color-scheme: dark)')?.matches
      ? 'dark'
      : 'light';
  }
}
