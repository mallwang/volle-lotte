import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { I18nService } from './i18n.service';

/** Route `title` is an i18n key; the tab title follows the language as well as the route. */
@Injectable({ providedIn: 'root' })
export class PageTitleStrategy extends TitleStrategy {
  private readonly doc = inject(DOCUMENT);
  private readonly i18n = inject(I18nService);
  private readonly key = signal<string | undefined>(undefined);

  constructor() {
    super();
    effect(() => {
      const key = this.key();
      this.doc.title = key ? `${this.i18n.t(key)} · Volle Lotte` : 'Volle Lotte';
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.key.set(this.buildTitle(snapshot));
  }
}
