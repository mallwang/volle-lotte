import { Component, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterOutlet } from '@angular/router';
import { MessageModule } from 'primeng/message';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToastModule } from 'primeng/toast';
import { SocketService } from './core/socket.service';
import { ThemeService, type ThemeMode } from './core/theme.service';

@Component({
  imports: [RouterOutlet, FormsModule, MessageModule, SelectButtonModule, ToastModule],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  protected readonly socket = inject(SocketService);
  protected readonly theme = inject(ThemeService);
  protected readonly modes: { label: string; value: ThemeMode }[] = [
    { label: 'System', value: 'system' },
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
  ];
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
