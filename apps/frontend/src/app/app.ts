import { Component, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { version } from '../../package.json';
import { I18nService } from './core/i18n.service';
import { SocketService } from './core/socket.service';
import { ThemeService } from './core/theme.service';
import { TranslatePipe } from './core/translate.pipe';

@Component({
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    FormsModule,
    MessageModule,
    ButtonModule,
    TooltipModule,
    SelectModule,
    ToastModule,
    TranslatePipe,
  ],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  protected readonly version = version;
  protected readonly socket = inject(SocketService);
  protected readonly theme = inject(ThemeService);
  protected readonly i18n = inject(I18nService);
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
