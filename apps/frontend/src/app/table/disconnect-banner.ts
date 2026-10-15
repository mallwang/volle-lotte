import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Difficulty, GameView } from 'game-rules';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { errorMessage, type Msg } from '../core/error-message';
import { isHost, seatName } from '../core/game-view';
import { I18nService } from '../core/i18n.service';
import { SocketService } from '../core/socket.service';
import { TranslatePipe } from '../core/translate.pipe';

/** Reconnect grace period of the backend, only used to scale the countdown bar. */
const GRACE_SECONDS = 60;
export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'random'];

/** Shows disconnected players with the grace countdown and the host decision controls. */
@Component({
  selector: 'app-disconnect-banner',
  imports: [FormsModule, ButtonModule, DialogModule, MessageModule, TranslatePipe],
  template: `
    @for (d of entries(); track d.seat) {
      <p-message severity="warn" role="status" styleClass="vl-block">
        <div>
          {{ 'banner.disconnected' | t: { name: d.name } }}
          @if (!d.pending) {
            {{ 'banner.window' | t: { n: d.remaining } }}
            <progress
              [max]="graceSeconds"
              [value]="d.remaining"
              [attr.aria-label]="'banner.windowFor' | t: { name: d.name }"
            ></progress>
          } @else if (!host()) {
            {{ 'banner.deciding' | t }}
          }
        </div>
      </p-message>
    }
    <p-dialog
      [visible]="host() && pendingEntries().length > 0"
      [closable]="false"
      [modal]="true"
      [header]="'banner.title' | t"
      appendTo="self"
      [style]="{ width: '26rem', maxWidth: '95vw' }"
    >
      @for (d of pendingEntries(); track d.seat) {
        <div class="vl-form">
          <p>{{ 'banner.didNotReturn' | t: { name: d.name } }}</p>
          <label class="vl-field">
            {{ 'banner.difficultyFor' | t: { name: d.name } }}
            <select [name]="'difficulty-' + d.seat" [(ngModel)]="difficulty">
              @for (o of difficulties; track o) {
                <option [value]="o">{{ 'difficulty.' + o | t }}</option>
              }
            </select>
          </label>
          <div class="vl-actions">
            <p-button [label]="'banner.replace' | t" (onClick)="decide(d.seat, 'computer')" />
            <p-button
              [label]="'banner.free' | t"
              severity="secondary"
              (onClick)="decide(d.seat, 'free')"
            />
          </div>
        </div>
      }
      @if (error()) {
        <p-message severity="error" role="alert">{{ error()?.() }}</p-message>
      }
    </p-dialog>
  `,
})
export class DisconnectBanner {
  readonly game = input.required<GameView>();
  private readonly socket = inject(SocketService);
  private readonly i18n = inject(I18nService);
  private readonly now = signal(Date.now());
  protected readonly graceSeconds = GRACE_SECONDS;
  protected readonly difficulties = DIFFICULTIES;
  protected readonly difficulty = signal<Difficulty>('medium');
  protected readonly error = signal<Msg | null>(null);
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
          name: seatName(s, this.i18n),
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
    this.error.set(ack.ok ? null : () => errorMessage(ack, this.i18n));
  }
}
