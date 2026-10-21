import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MobileI18nService } from './core/i18n.service';
import { MobileThemeService } from './core/theme.service';
import { MobileSocketService } from './core/mobile-socket.service';
import { TranslatePipe } from './core/translate.pipe';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TranslatePipe],
  template: `
    <header>
      <img src="volle-lotte.png" alt="" width="32" height="32" />
      <h1>Volle Lotte</h1>
      <button
        type="button"
        class="icon"
        [attr.aria-label]="'language.label' | t"
        (click)="i18n.set(i18n.lang() === 'de' ? 'en' : 'de')"
      >
        {{ i18n.lang() === 'de' ? '🇩🇪' : '🇬🇧' }}
      </button>
      <button
        type="button"
        class="icon"
        [attr.aria-label]="
          (theme.mode() === 'dark' ? 'theme.switchToLight' : 'theme.switchToDark') | t
        "
        (click)="theme.toggle()"
      >
        {{ theme.mode() === 'dark' ? '☀️' : '🌙' }}
      </button>
    </header>
    @if (!socket.online()) {
      <p role="status" class="offline">{{ 'mobile.offline' | t }}</p>
    }
    @if (socket.notice(); as notice) {
      <p role="status" class="notice">
        {{ notice | t }}
        <button type="button" (click)="socket.notice.set(null)">
          {{ 'mobile.notice.dismiss' | t }}
        </button>
      </p>
    }
    <main><router-outlet /></main>
  `,
})
export class App {
  protected readonly socket = inject(MobileSocketService);
  protected readonly i18n = inject(MobileI18nService);
  protected readonly theme = inject(MobileThemeService);
}
