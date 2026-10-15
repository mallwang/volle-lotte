import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';
import { de } from '../i18n/de';
import { en } from '../i18n/en';

export type LanguageCode = 'en' | 'de';
export interface Language {
  code: LanguageCode;
  /** Native name. */
  name: string;
  /** Decorative flag image under /flags. */
  flag: string;
}

/** localStorage key of the chosen language. */
export const LANGUAGE_KEY = 'vl-language';
const DICTIONARIES: Record<LanguageCode, Record<string, string>> = { en, de };

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly doc = inject(DOCUMENT);

  readonly languages: Language[] = [
    { code: 'en', name: 'English', flag: '/flags/en.svg' },
    { code: 'de', name: 'Deutsch', flag: '/flags/de.svg' },
  ];
  readonly lang = signal<LanguageCode>(this.initial());

  constructor() {
    effect(() => (this.doc.documentElement.lang = this.lang()));
  }

  set(code: string): void {
    if (!this.supported(code)) return;
    this.lang.set(code);
    try {
      localStorage.setItem(LANGUAGE_KEY, code);
    } catch {
      // storage unavailable: the choice only lasts for this page view
    }
  }

  /** Active dictionary, then English, then the key itself; `{name}` placeholders come from `params`. */
  t(key: string, params?: Record<string, string | number>): string {
    const text = DICTIONARIES[this.lang()][key] ?? en[key as keyof typeof en] ?? key;
    return params ? text.replace(/\{(\w+)\}/g, (m, p) => String(params[p] ?? m)) : text;
  }

  private supported(code: string | null | undefined): code is LanguageCode {
    return this.languages.some((l) => l.code === code);
  }

  private initial(): LanguageCode {
    try {
      const stored = localStorage.getItem(LANGUAGE_KEY);
      if (this.supported(stored)) return stored;
    } catch {
      // storage unreadable: fall through to the browser language
    }
    const nav = this.doc.defaultView?.navigator;
    for (const tag of nav?.languages ?? (nav?.language ? [nav.language] : [])) {
      const base = tag.toLowerCase().split('-')[0];
      if (this.supported(base)) return base;
    }
    return 'en';
  }
}
