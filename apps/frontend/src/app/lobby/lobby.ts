import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { GameSummary } from 'game-rules';
import { errorMessage } from '../core/error-message';
import { SocketService } from '../core/socket.service';

@Component({
  selector: 'app-lobby',
  imports: [FormsModule, RouterLink],
  template: `
    <h2>Games</h2>
    <a routerLink="/create-game">Create game</a>
    @if (socket.games().length === 0) {
      <p>No open games.</p>
    }
    <ul>
      @for (g of socket.games(); track g.id) {
        <li>
          <strong>{{ g.name }}</strong> host {{ g.host }}, target {{ g.targetScore }}, seats
          {{ g.seatsUsed }}/{{ g.seatsTotal }}
          <span aria-label="password protected">&#128274;</span>
          @if (g.phase === 'lobby') {
            <button type="button" (click)="selected.set(g.id); error.set('')">Join</button>
          } @else {
            <em>running</em>
          }
          @if (selected() === g.id) {
            <form (ngSubmit)="join(g)">
              <label>
                Password for {{ g.name }}
                <input name="password" type="password" [(ngModel)]="password" autocomplete="off" />
              </label>
              <button type="submit" [disabled]="retry() > 0">Enter game</button>
              @if (retry() > 0) {
                <p class="error" role="status">Locked. Try again in {{ retry() }} s.</p>
              }
              @if (error() && retry() === 0) {
                <p class="error" role="alert">{{ error() }}</p>
              }
            </form>
          }
        </li>
      }
    </ul>
  `,
})
export class Lobby {
  protected readonly socket = inject(SocketService);
  private readonly router = inject(Router);
  protected readonly selected = signal<string | null>(null);
  protected readonly password = signal('');
  protected readonly error = signal('');
  protected readonly retry = signal(0);
  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearInterval(this.timer));
  }

  protected async join(g: GameSummary): Promise<void> {
    const ack = await this.socket.join({ gameId: g.id, password: this.password() });
    if (ack.ok) {
      this.password.set('');
      await this.router.navigate(['/game', g.id]);
    } else {
      this.error.set(errorMessage(ack));
      if (ack.reason === 'locked') this.lock(Math.ceil((ack.retryAfterMs ?? 0) / 1000));
    }
  }

  private lock(seconds: number): void {
    this.retry.set(seconds);
    this.timer = setInterval(() => {
      this.retry.update((n) => Math.max(0, n - 1));
      if (this.retry() === 0) clearInterval(this.timer);
    }, 1000);
  }
}
