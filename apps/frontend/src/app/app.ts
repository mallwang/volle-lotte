import { Component, computed, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToastModule } from 'primeng/toast';
import { I18nService } from './core/i18n.service';
import { SocketService } from './core/socket.service';
import { ThemeService, type ThemeMode } from './core/theme.service';
import { TranslatePipe } from './core/translate.pipe';

@Component({
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    FormsModule,
    MessageModule,
    SelectButtonModule,
    SelectModule,
    ToastModule,
    TranslatePipe,
  ],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  protected readonly socket = inject(SocketService);
  protected readonly theme = inject(ThemeService);
  protected readonly i18n = inject(I18nService);
  protected readonly modes = computed<{ label: string; value: ThemeMode }[]>(() => [
    { label: this.i18n.t('theme.system'), value: 'system' },
    { label: this.i18n.t('theme.light'), value: 'light' },
    { label: this.i18n.t('theme.dark'), value: 'dark' },
  ]);
  private readonly router = inject(Router);
  private signedIn = false;

  constructor() {
    effect(() => {
      const session = this.socket.session();
      const game = this.socket.game();
      if (session) {
        this.signedIn = true;
        if (game) void this.router.navigate(['/game', game.id]);
      } else if (this.signedIn) {
        this.signedIn = false;
        void this.router.navigateByUrl('/nickname');
      }
    });
  }
}
