import { Component, effect, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { SocketService } from './core/socket.service';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  protected readonly socket = inject(SocketService);
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
