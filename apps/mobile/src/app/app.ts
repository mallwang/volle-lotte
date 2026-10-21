import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MobileI18nService } from './core/i18n.service';
import { MobileSocketService } from './core/mobile-socket.service';
import { TranslatePipe } from './core/translate.pipe';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TranslatePipe],
  template: `
    <header><h1>Volle Lotte</h1></header>
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
}
