import { Component, inject, signal, type OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { GameSummary } from 'game-rules';
import { errorMessage } from '../core/error-message';
import { MobileI18nService } from '../core/i18n.service';
import { MobileSocketService } from '../core/mobile-socket.service';
import { JoinDialog } from '../join-dialog/join-dialog';
import { TranslatePipe } from '../core/translate.pipe';

@Component({
  selector: 'app-list',
  imports: [RouterLink, TranslatePipe, JoinDialog],
  template: `
    <div class="bar">
      <h2>{{ 'lobby.title' | t }}</h2>
      <a routerLink="/create" class="button primary">{{ 'lobby.create' | t }}</a>
    </div>
    @if (error()) {
      <p class="chip bad" role="alert">{{ error() }}</p>
    }
    @if (socket.games().length === 0) {
      <p>{{ 'lobby.empty' | t }}</p>
    }
    <ul class="grid">
      @for (g of socket.games(); track g.id) {
        <li class="card">
          <h3>{{ g.name }}</h3>
          <p>{{ g.host ? ('lobby.host' | t: { name: g.host }) : ('lobby.noHost' | t) }}</p>
          <p>
            {{
              'lobby.summary' | t: { target: g.targetScore, used: g.seatsUsed, total: g.seatsTotal }
            }}
          </p>
          <p>
            <span class="chip" [class.warn]="g.seatsUsed >= g.seatsTotal">
              {{
                g.seatsUsed < g.seatsTotal
                  ? ('lobby.free' | t: { n: g.seatsTotal - g.seatsUsed })
                  : ('lobby.full' | t)
              }}
            </span>
            <span class="chip">
              {{ g.protected ? ('lobby.passwordProtected' | t) : ('lobby.open' | t) }}
            </span>
          </p>
          @if (g.banned) {
            <p class="chip bad" role="alert">{{ 'error.banned' | t }}</p>
          } @else if (socket.game()?.id === g.id) {
            <button type="button" (click)="open(g)">{{ 'lobby.rejoin' | t }}</button>
          } @else if (g.phase === 'lobby') {
            @if (g.seatsUsed < g.seatsTotal) {
              <button type="button" (click)="selected.set(g)">{{ 'lobby.join' | t }}</button>
            }
          } @else if (g.rejoinable) {
            <button type="button" (click)="rejoin(g)">{{ 'lobby.rejoin' | t }}</button>
          } @else {
            <span class="chip">{{ 'lobby.running' | t }}</span>
          }
        </li>
      }
    </ul>
    @if (selected(); as g) {
      <app-join-dialog [game]="g" (closed)="closed($event)" />
    }
  `,
})
export class List implements OnInit {
  protected readonly socket = inject(MobileSocketService);
  private readonly router = inject(Router);
  private readonly i18n = inject(MobileI18nService);
  /** Game the join dialog is open for. */
  protected readonly selected = signal<GameSummary | null>(null);
  protected readonly error = signal('');

  /** The push list is not received while seated, so refresh it when the screen opens. */
  ngOnInit(): void {
    void this.socket.refreshLobby();
  }

  protected open(g: GameSummary): Promise<boolean> {
    return this.router.navigateByUrl(g.phase === 'lobby' ? `/game/${g.id}` : '/started');
  }

  protected closed(message: string) {
    this.selected.set(null);
    this.error.set(message);
  }

  protected async rejoin(g: GameSummary): Promise<void> {
    const ack = await this.socket.rejoin(g.id);
    if (ack.ok) await this.router.navigate(['/game', g.id]);
    else this.error.set(errorMessage(ack, this.i18n));
  }
}
