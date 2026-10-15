import { Component, computed, inject, signal } from '@angular/core';
import type { Action } from 'game-rules';
import { errorMessage } from '../core/error-message';
import { logText, playerSeats } from '../core/game-view';
import { SocketService } from '../core/socket.service';
import { DisconnectBanner } from './disconnect-banner';

@Component({
  selector: 'app-table',
  imports: [DisconnectBanner],
  template: `
    @if (socket.game(); as view) {
      @if (view.game; as state) {
        <h2>{{ view.name }}</h2>
        <app-disconnect-banner [game]="view" />
        <p>Deck: {{ state.deckSize }} cards. Target {{ state.rules.targetScore }}.</p>
        <table>
          <caption>
            Scores
          </caption>
          <thead>
            <tr>
              <th scope="col">Player</th>
              <th scope="col">Score</th>
            </tr>
          </thead>
          <tbody>
            @for (p of state.players; track $index) {
              <tr [attr.aria-current]="$index === state.current ? 'true' : null">
                <td>
                  {{ $index === state.current ? '&gt; ' : '' }}{{ p.name }}
                  @if (view.seats[seats()[$index]]?.connected === false) {
                    (offline)
                  }
                </td>
                <td>{{ p.score }}</td>
              </tr>
            }
          </tbody>
        </table>
        @if (state.turn; as turn) {
          <p>
            Active: {{ state.players[state.current].name }}. Card: {{ turn.card ?? 'none' }}. Phase:
            {{ turn.phase }}. Carried {{ turn.carried }}, run {{ turn.run }}.
          </p>
          @if (turn.dice.length > 0) {
            <div role="group" aria-label="Dice">
              @for (d of turn.dice; track $index) {
                <button
                  type="button"
                  [attr.aria-pressed]="chosen().includes($index)"
                  [disabled]="!mine() || turn.phase !== 'select'"
                  (click)="toggle($index)"
                >
                  {{ d }}
                </button>
              }
            </div>
          }
          <button type="button" [disabled]="!can('draw')" (click)="act({ type: 'draw' })">
            Draw card
          </button>
          <button type="button" [disabled]="!canThrow()" (click)="act({ type: 'throw' })">
            Throw dice
          </button>
          <button
            type="button"
            [disabled]="!can('select') || chosen().length === 0"
            (click)="select()"
          >
            Set aside selected
          </button>
          <button type="button" [disabled]="!canBank()" (click)="act({ type: 'bank' })">
            Bank points
          </button>
        }
        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }
      }
      <h3>Log</h3>
      <ol aria-live="polite">
        @for (e of view.log; track $index) {
          <li>{{ text(e) }}</li>
        }
      </ol>
      <button type="button" (click)="socket.leave()">Leave game</button>
    }
  `,
})
export class Table {
  protected readonly socket = inject(SocketService);
  protected readonly chosen = signal<number[]>([]);
  protected readonly error = signal('');
  protected readonly seats = computed(() => {
    const g = this.socket.game();
    return g ? playerSeats(g) : [];
  });
  /** It is my turn and the game is not paused. */
  protected readonly mine = computed(() => {
    const g = this.socket.game();
    if (!g?.game || g.pending.length > 0) return false;
    return this.seats()[g.game.current] === g.you.seat;
  });

  protected can(phase: string): boolean {
    return this.mine() && this.socket.game()?.game?.turn?.phase === phase;
  }

  /** After a partial selection (phase decide) the remaining free dice can be thrown again. */
  protected canThrow(): boolean {
    const turn = this.socket.game()?.game?.turn;
    return this.can('throw') || (this.can('decide') && (turn?.free ?? 0) > 0);
  }

  /** Fireworks and Street must run to a bust or Volle Lotte, so banking is never offered. */
  protected canBank(): boolean {
    const card = this.socket.game()?.game?.turn?.card;
    return this.can('decide') && card !== 'fireworks' && card !== 'street';
  }

  protected toggle(i: number): void {
    this.chosen.update((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]));
  }

  protected text = (e: Parameters<typeof logText>[1]): string => {
    const g = this.socket.game();
    return g ? logText(g, e) : '';
  };

  protected select(): Promise<void> {
    return this.act({ type: 'select', dice: [...this.chosen()].sort((a, b) => a - b) });
  }

  protected async act(action: Action): Promise<void> {
    const ack = await this.socket.send('turn:action', { action });
    this.error.set(ack.ok ? '' : errorMessage(ack));
    if (ack.ok) this.chosen.set([]);
  }
}
