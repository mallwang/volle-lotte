import { Injectable, signal } from '@angular/core';
import { de, en } from 'client-core';
import { mobileDe } from '../i18n/mobile-de';
import { mobileEn } from '../i18n/mobile-en';

export type LanguageCode = 'en' | 'de';
/** Same key as the desktop client, so the choice carries over. */
export const LANGUAGE_KEY = 'vl-language';
const DICTIONARIES: Record<LanguageCode, Record<string, string>> = {
  en: { ...en, ...mobileEn },
  de: { ...de, ...mobileDe },
};

@Injectable({ providedIn: 'root' })
export class MobileI18nService {
  readonly lang = signal<LanguageCode>(this.initial());

  set(code: LanguageCode): void {
    this.lang.set(code);
    try {
      localStorage.setItem(LANGUAGE_KEY, code);
    } catch {
      // storage unavailable: the choice only lasts for this page view
    }
  }

  /** Active dictionary, then English, then the key itself; `{name}` placeholders come from `params`. */
  t(key: string, params?: Record<string, string | number>): string {
    const text = DICTIONARIES[this.lang()][key] ?? DICTIONARIES.en[key] ?? key;
    return params ? text.replace(/\{(\w+)\}/g, (m, p) => String(params[p] ?? m)) : text;
  }

  private initial(): LanguageCode {
    try {
      const stored = localStorage.getItem(LANGUAGE_KEY);
      if (stored === 'en' || stored === 'de') return stored;
    } catch {
      // storage unreadable: fall through to the browser language
    }
    return navigator.language.toLowerCase().startsWith('de') ? 'de' : 'en';
  }
}
