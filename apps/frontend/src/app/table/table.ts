import { Component, computed, effect, inject, signal } from '@angular/core';
import type { Action } from 'game-rules';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { errorMessage } from '../core/error-message';
import { logText, playerSeats } from '../core/game-view';
import { I18nService } from '../core/i18n.service';
import { SocketService } from '../core/socket.service';
import { TranslatePipe } from '../core/translate.pipe';
import { CardTile } from '../shared/card-tile';
import { DiceTile } from '../shared/dice-tile';
import { PlayerTile } from '../shared/player-tile';
import { DisconnectBanner } from './disconnect-banner';

/** Log events shown as a toast to every player, by severity (FR-010, FR-014). */
const ANNOUNCED: Record<string, 'info' | 'warn' | 'success'> = {
  banked: 'success',
  bust: 'warn',
  turnLost: 'warn',
  penalty: 'warn',
  volleLotte: 'success',
  gameOver: 'info',
  joined: 'info',
  left: 'info',
  disconnected: 'warn',
  reconnected: 'info',
};

@Component({
  selector: 'app-table',
  imports: [ButtonModule, CardTile, DiceTile, DisconnectBanner, PlayerTile, TranslatePipe],
  template: `
    @if (socket.game(); as view) {
      @if (view.game; as state) {
        <h2>{{ view.name }}</h2>
        <app-disconnect-banner [game]="view" />
        <div class="vl-table">
          <section [attr.aria-label]="'table.table' | t">
            <p>
              {{ 'table.deck' | t: { size: state.deckSize, target: state.rules.targetScore } }}
            </p>
            @if (state.turn; as turn) {
              <p>
                {{
                  'table.active'
                    | t
                      : {
                          name: state.players[state.current].name,
                          phase: 'table.phase.' + turn.phase | t,
                          carried: turn.carried,
                          run: turn.run,
                        }
                }}
              </p>
              <app-card-tile [card]="turn.card ?? null" />
              <div class="vl-dice" role="group" [attr.aria-label]="'table.dice' | t">
                @for (i of slots; track i) {
                  <app-dice-tile
                    [value]="turn.dice[i] ?? null"
                    [selected]="shown().includes(i)"
                    [disabled]="i >= turn.dice.length || !mine() || turn.phase !== 'select'"
                    (toggled)="toggle(i)"
                  />
                }
              </div>
              <div class="vl-turn-actions">
                @for (a of actions(); track a.id) {
                  <div>
                    <button
                      pButton
                      type="button"
                      [disabled]="!!a.reason"
                      [attr.aria-describedby]="a.reason ? 'reason-' + a.id : null"
                      (click)="a.run()"
                    >
                      {{ a.label }}
                    </button>
                    <small [id]="'reason-' + a.id">{{ a.reason }}</small>
                  </div>
                }
              </div>
            }
          </section>
          <section [attr.aria-label]="'table.players' | t">
            <h3>{{ 'table.players' | t }}</h3>
            <ul class="vl-players">
              @for (p of state.players; track $index) {
                <li>
                  <app-player-tile
                    [name]="p.name"
                    [score]="p.score"
                    [active]="$index === state.current"
                    [online]="view.seats[seats()[$index]]?.connected !== false"
                    [computer]="view.seats[seats()[$index]]?.state === 'computer'"
                  />
                </li>
              }
            </ul>
            <h3>{{ 'table.log' | t }}</h3>
            <ol class="vl-log" role="log" aria-live="polite">
              @for (e of newestFirst(); track e) {
                <li>
                  @for (part of parts(e); track $index) {
                    @if (part.die) {
                      <span class="vl-log-die">{{ part.text }}</span>
                    } @else {
                      {{ part.text }}
                    }
                  }
                </li>
              }
            </ol>
          </section>
        </div>
      }
      <p-button [label]="'game.leave' | t" severity="secondary" (onClick)="socket.leave()" />
    }
  `,
})
export class Table {
  protected readonly socket = inject(SocketService);
  private readonly i18n = inject(I18nService);
  protected readonly chosen = signal<number[]>([]);
  /** Always six slots, so the table does not jump while dice are not thrown. */
  protected readonly slots = [0, 1, 2, 3, 4, 5];
  /** My own ticks while I play, otherwise the active player's ticks pushed by the server. */
  protected readonly shown = computed(() =>
    this.mine() ? this.chosen() : (this.socket.game()?.preview ?? []),
  );
  private readonly messages = inject(MessageService);
  /** Log entries already announced; the server log keeps growing, so the length is a stable cursor. */
  private seen = this.socket.game()?.log.length ?? 0;
  /** Newest entry on top, so nobody has to scroll to see what just happened. */
  protected readonly newestFirst = computed(() => [...(this.socket.game()?.log ?? [])].reverse());
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

  protected readonly actions = computed(() => {
    const turn = this.socket.game()?.game?.turn;
    const mine = this.mine();
    const t = (key: string) => this.i18n.t(key);
    const wait = (ok: boolean, why: string) => {
      if (!mine) return t('table.notYourTurn');
      return ok ? '' : why;
    };
    return [
      {
        id: 'draw',
        label: t('table.draw'),
        reason: wait(this.can('draw'), t('table.drawn')),
        run: () => this.act({ type: 'draw' }),
      },
      {
        id: 'throw',
        label: t('table.throw'),
        reason: wait(
          this.canThrow(),
          turn?.phase === 'draw' ? t('table.drawFirst') : t('table.setAsideFirst'),
        ),
        run: () => this.act({ type: 'throw' }),
      },
      {
        id: 'select',
        label: t('table.select'),
        reason: wait(
          this.can('select') && this.chosen().length > 0,
          this.can('select') ? t('table.selectOne') : t('table.throwFirst'),
        ),
        run: () => this.select(),
      },
      {
        id: 'bank',
        label: t('table.bank'),
        reason: wait(this.canBank(), t('table.nothingToBank')),
        run: () => this.act({ type: 'bank' }),
      },
    ];
  });

  constructor() {
    effect(() => {
      const g = this.socket.game();
      if (!g) return;
      for (const e of g.log.slice(this.seen)) {
        const severity =
          ANNOUNCED[e.kind === 'turn' && typeof e.data === 'object' ? e.data.type : e.kind];
        if (severity) this.messages.add({ severity, detail: logText(g, e, this.i18n), life: 4000 });
      }
      this.seen = g.log.length;
    });
  }

  protected can(phase: string): boolean {
    return this.mine() && this.socket.game()?.game?.turn?.phase === phase;
  }

  /** After a partial selection (phase decide) the remaining free dice can be thrown again. */
  protected canThrow(): boolean {
    const turn = this.socket.game()?.game?.turn;
    return this.can('throw') || (this.can('decide') && (turn?.free ?? 0) > 0);
  }

  /** Star and Street must run to a bust or Volle Lotte, so banking is never offered. */
  protected canBank(): boolean {
    const card = this.socket.game()?.game?.turn?.card;
    return this.can('decide') && card !== 'star' && card !== 'street';
  }

  protected toggle(i: number): void {
    if (i >= (this.socket.game()?.game?.turn?.dice.length ?? 0)) return;
    this.chosen.update((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]));
    void this.socket.send('turn:preview', { dice: this.chosen() });
  }

  protected text = (e: Parameters<typeof logText>[1]): string => {
    const g = this.socket.game();
    return g ? logText(g, e, this.i18n) : '';
  };

  /** Log text split so every thrown or set-aside die can be framed. */
  protected parts = (e: Parameters<typeof logText>[1]): { text: string; die: boolean }[] => {
    const text = this.text(e);
    const data = e.kind === 'turn' && typeof e.data === 'object' ? e.data : null;
    const dice = data && 'dice' in data ? data.dice.join(' ') : '';
    const at = dice ? text.indexOf(dice) : -1;
    if (at < 0) return [{ text, die: false }];
    return [
      { text: text.slice(0, at), die: false },
      ...dice.split(' ').map((text) => ({ text, die: true })),
      { text: text.slice(at + dice.length), die: false },
    ];
  };

  protected select(): Promise<void> {
    return this.act({ type: 'select', dice: [...this.chosen()].sort((a, b) => a - b) });
  }

  protected async act(action: Action): Promise<void> {
    const ack = await this.socket.send('turn:action', { action });
    if (ack.ok) this.chosen.set([]);
    else
      this.messages.add({ severity: 'error', detail: errorMessage(ack, this.i18n), sticky: true });
  }
}
