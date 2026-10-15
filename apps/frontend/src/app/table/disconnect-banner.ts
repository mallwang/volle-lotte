import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Difficulty, GameView } from 'game-rules';
import { errorMessage } from '../core/error-message';
import { isHost, seatName } from '../core/game-view';
import { SocketService } from '../core/socket.service';

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'random'];

/** Shows disconnected players with the grace countdown and the host decision controls. */
@Component({
  selector: 'app-disconnect-banner',
  imports: [FormsModule],
  template: `
    @for (d of entries(); track d.seat) {
      <section role="alert">
        <p>
          {{ d.name }} is disconnected.
          @if (!d.pending) {
            Reconnect window: {{ d.remaining }} s.
          } @else if (!host()) {
            Waiting for the host.
          }
        </p>
        @if (d.pending && host()) {
          <label>
            Difficulty for {{ d.name }}
            <select [name]="'difficulty-' + d.seat" [(ngModel)]="difficulty">
              @for (o of difficulties; track o) {
                <option [value]="o">{{ o }}</option>
              }
            </select>
          </label>
          <button type="button" (click)="decide(d.seat, 'computer')">Replace with computer</button>
          <button type="button" (click)="decide(d.seat, 'free')">Free seat</button>
        }
      </section>
    }
    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
  `,
})
export class DisconnectBanner {
  readonly game = input.required<GameView>();
  private readonly socket = inject(SocketService);
  private readonly now = signal(Date.now());
  protected readonly difficulties = DIFFICULTIES;
  protected readonly difficulty = signal<Difficulty>('medium');
  protected readonly error = signal('');
  protected readonly host = computed(() => isHost(this.game()));
  protected readonly entries = computed(() => {
    const g = this.game();
    return g.seats.flatMap((s, seat) => {
      const pending = g.pending.includes(seat);
      if (s.state !== 'human' || (s.connected !== false && !pending)) return [];
      const end = g.graceEndsAt[seat] ?? 0;
      return [
        {
          seat,
          pending,
          name: seatName(s),
          remaining: Math.max(0, Math.ceil((end - this.now()) / 1000)),
        },
      ];
    });
  });

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected async decide(seat: number, decision: 'computer' | 'free'): Promise<void> {
    const ack = await this.socket.send('host:decide', {
      seat,
      decision,
      difficulty: decision === 'computer' ? this.difficulty() : undefined,
    });
    this.error.set(ack.ok ? '' : errorMessage(ack));
  }
}
