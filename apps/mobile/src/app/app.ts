import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MobileConnectionService } from './core/mobile-connection.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <header><h1>Volle Lotte</h1></header>
    <main>
      <p>{{ connection.online() ? 'Connected' : 'Connecting…' }}</p>
      <router-outlet />
    </main>
  `,
})
export class App {
  protected readonly connection = inject(MobileConnectionService);
}
