import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Difficulty, GameView } from 'game-rules';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { errorMessage } from '../core/error-message';
import { isHost, seatName } from '../core/game-view';
import { SocketService } from '../core/socket.service';

/** Reconnect grace period of the backend, only used to scale the countdown bar. */
const GRACE_SECONDS = 60;
export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'random'];

/** Shows disconnected players with the grace countdown and the host decision controls. */
@Component({
  selector: 'app-disconnect-banner',
  imports: [FormsModule, ButtonModule, DialogModule, MessageModule],
  template: `
    @for (d of entries(); track d.seat) {
      <p-message severity="warn" role="status" styleClass="vl-block">
        <div>
          {{ d.name }} is disconnected.
          @if (!d.pending) {
            Reconnect window: {{ d.remaining }} s.
            <progress
              [max]="graceSeconds"
              [value]="d.remaining"
              [attr.aria-label]="'Reconnect window for ' + d.name"
            ></progress>
          } @else if (!host()) {
            Host is deciding.
          }
        </div>
      </p-message>
    }
    <p-dialog
      [visible]="host() && pendingEntries().length > 0"
      [closable]="false"
      [modal]="true"
      header="Player disconnected"
      appendTo="self"
      [style]="{ width: '26rem', maxWidth: '95vw' }"
    >
      @for (d of pendingEntries(); track d.seat) {
        <div class="vl-form">
          <p>{{ d.name }} did not come back. Replace with a computer or free the seat?</p>
          <label class="vl-field">
            Difficulty for {{ d.name }}
            <select [name]="'difficulty-' + d.seat" [(ngModel)]="difficulty">
              @for (o of difficulties; track o) {
                <option [value]="o">{{ o }}</option>
              }
            </select>
          </label>
          <div class="vl-actions">
            <p-button label="Replace with computer" (onClick)="decide(d.seat, 'computer')" />
            <p-button label="Free seat" severity="secondary" (onClick)="decide(d.seat, 'free')" />
          </div>
        </div>
      }
      @if (error()) {
        <p-message severity="error" role="alert">{{ error() }}</p-message>
      }
    </p-dialog>
  `,
})
export class DisconnectBanner {
  readonly game = input.required<GameView>();
  private readonly socket = inject(SocketService);
  private readonly now = signal(Date.now());
  protected readonly graceSeconds = GRACE_SECONDS;
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

  protected readonly pendingEntries = computed(() => this.entries().filter((e) => e.pending));

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
