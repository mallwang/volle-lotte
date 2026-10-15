import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import type { GameSummary } from 'game-rules';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { errorMessage } from '../core/error-message';
import { SocketService } from '../core/socket.service';

@Component({
  selector: 'app-lobby',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    CardModule,
    DialogModule,
    InputTextModule,
    MessageModule,
    TagModule,
  ],
  template: `
    <div class="vl-header">
      <h2>Games</h2>
      <a routerLink="/create-game" class="p-button p-component">Create game</a>
    </div>
    @if (socket.games().length === 0) {
      <p class="vl-empty"><i class="pi pi-inbox" aria-hidden="true"></i> No open games.</p>
    }
    <ul class="vl-cards">
      @for (g of socket.games(); track g.id) {
        <li>
          <p-card [header]="g.name" [subheader]="'Host ' + g.host">
            <p>
              Target {{ g.targetScore }}, seats {{ g.seatsUsed }}/{{ g.seatsTotal }}
              <p-tag
                [value]="g.seatsUsed < g.seatsTotal ? g.seatsTotal - g.seatsUsed + ' free' : 'Full'"
                [icon]="g.seatsUsed < g.seatsTotal ? 'pi pi-user-plus' : 'pi pi-ban'"
                [severity]="g.seatsUsed < g.seatsTotal ? 'success' : 'secondary'"
              />
              <i class="pi pi-lock" role="img" aria-label="password protected"></i>
            </p>
            @if (g.phase === 'lobby') {
              <p-button label="Join" (onClick)="open(g.id, $event)" />
            } @else {
              <p-tag value="Running" icon="pi pi-play" severity="info" />
            }
          </p-card>
        </li>
      }
    </ul>
    <p-dialog
      [visible]="!!selectedGame()"
      (visibleChange)="!$event && close()"
      [modal]="true"
      [header]="'Join ' + selectedGame()?.name"
      appendTo="self"
      [style]="{ width: '24rem', maxWidth: '95vw' }"
    >
      <form class="vl-form" (ngSubmit)="join(selectedGame()!)">
        <label class="vl-field">
          Password for {{ selectedGame()?.name }}
          <input
            pInputText
            name="password"
            type="password"
            [(ngModel)]="password"
            autocomplete="off"
          />
        </label>
        @if (retry() > 0) {
          <p-message severity="warn" role="status">Locked. Try again in {{ retry() }} s.</p-message>
        }
        @if (error() && retry() === 0) {
          <p-message severity="error" role="alert">{{ error() }}</p-message>
        }
        <div class="vl-actions">
          <p-button type="submit" label="Enter game" [disabled]="retry() > 0" />
        </div>
      </form>
    </p-dialog>
  `,
})
export class Lobby {
  protected readonly socket = inject(SocketService);
  private readonly router = inject(Router);
  protected readonly selected = signal<string | null>(null);
  protected readonly selectedGame = computed(
    () => this.socket.games().find((g) => g.id === this.selected()) ?? null,
  );
  protected readonly password = signal('');
  protected readonly error = signal('');
  protected readonly retry = signal(0);
  private timer?: ReturnType<typeof setInterval>;
  private trigger?: HTMLElement;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearInterval(this.timer));
  }

  protected open(id: string, event: Event): void {
    this.trigger = (event.target as HTMLElement).closest('button') ?? undefined;
    this.error.set('');
    this.selected.set(id);
  }

  protected close(): void {
    this.selected.set(null);
    this.password.set('');
    this.trigger?.focus();
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
