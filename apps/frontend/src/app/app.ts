import { Component, computed, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import type { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MenubarModule } from 'primeng/menubar';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { version } from '../../package.json';
import { I18nService } from './core/i18n.service';
import { SocketService } from './core/socket.service';
import { ThemeService } from './core/theme.service';
import { STAGE_HEIGHT, STAGE_WIDTH, TableScale } from './core/table-scale';
import { TranslatePipe } from './core/translate.pipe';
import { ScaleNotice } from './shared/scale-notice';
import { WindowTooSmall } from './shared/window-too-small';

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
    MenubarModule,
    ConfirmDialogModule,
    TagModule,
    ToastModule,
    TranslatePipe,
    ScaleNotice,
    WindowTooSmall,
  ],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  protected readonly version = version;
  protected readonly socket = inject(SocketService);
  protected readonly theme = inject(ThemeService);
  protected readonly i18n = inject(I18nService);
  protected readonly tableScale = inject(TableScale);
  private readonly router = inject(Router);
  private signedIn = false;

  /** Page links (disabled without a session) and, while a game is open, its status entry. */
  protected readonly items = computed<MenuItem[]>(() => {
    const signedIn = !!this.socket.session();
    const phase = this.socket.game()?.phase;
    const items: MenuItem[] = [
      { label: this.i18n.t('nav.games'), routerLink: '/lobby', disabled: !signedIn },
      { label: this.i18n.t('nav.create'), routerLink: '/create-game', disabled: !signedIn },
    ];
    if (phase === 'lobby' || phase === 'running') {
      items.push({ id: 'current', label: this.i18n.t('nav.current') });
    }
    return items;
  });
  protected readonly themeAction = computed(() =>
    this.i18n.t(this.theme.mode() === 'dark' ? 'theme.switchToLight' : 'theme.switchToDark'),
  );
  protected readonly themeLabel = computed(() => {
    const current = this.i18n.t(`theme.${this.theme.mode()}`);
    return this.i18n.t('theme.label') + ': ' + current + '. ' + this.themeAction();
  });
  protected readonly currentTag = computed(() =>
    this.i18n.t(`nav.current.${this.socket.game()?.phase === 'running' ? 'running' : 'lobby'}`),
  );

  /** Inline sizing for the scaled stage; empty at scale 1 so other screens are unchanged. */
  protected readonly outerStyle = computed(() => {
    const s = this.tableScale.scale();
    return s < 1 ? { width: `${STAGE_WIDTH * s}px`, height: `${STAGE_HEIGHT * s}px` } : null;
  });
  protected readonly innerStyle = computed(() => {
    const s = this.tableScale.scale();
    return s < 1
      ? { width: `${STAGE_WIDTH}px`, minHeight: `${STAGE_HEIGHT}px`, transform: `scale(${s})` }
      : null;
  });

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
