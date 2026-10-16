import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import type { Action, GameView, LogEntry } from 'game-rules';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { DicePrefs } from '../core/dice-prefs';
import { DiceRollService } from '../core/dice-roll';
import { errorMessage } from '../core/error-message';
import { logText, playerSeats, seatName } from '../core/game-view';
import { I18nService } from '../core/i18n.service';
import { SocketService } from '../core/socket.service';
import { TranslatePipe } from '../core/translate.pipe';
import { CardTile } from '../shared/card-tile';
import { DiceTile } from '../shared/dice-tile';
import { DieFace } from '../shared/die-face';
import { PlayerTile } from '../shared/player-tile';
import { DisconnectBanner } from './disconnect-banner';
import { SettingsDialog } from './settings-dialog';

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

/** How long a bust stays on the table before the next player's turn starts. */
const BUST_MS = 5000;

@Component({
  selector: 'app-table',
  imports: [
    ButtonModule,
    CardTile,
    DiceTile,
    DieFace,
    DisconnectBanner,
    NgTemplateOutlet,
    PlayerTile,
    SettingsDialog,
    TranslatePipe,
  ],
  template: `
    @if (socket.game(); as view) {
      <div class="vl-title-row">
        <h2>{{ view.name }}</h2>
        <p-button
          icon="pi pi-cog"
          [rounded]="true"
          [text]="true"
          severity="secondary"
          [ariaLabel]="'settings.open' | t"
          (onClick)="settingsOpen.set(true)"
        />
      </div>
      @if (view.game; as state) {
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
              <ng-template #act let-a>
                <div class="vl-action">
                  <button
                    pButton
                    type="button"
                    [disabled]="a.reason !== null"
                    [attr.aria-describedby]="a.reason ? 'reason-' + a.id : null"
                    (click)="a.run()"
                  >
                    {{ a.label }}
                  </button>
                  <small [id]="'reason-' + a.id">{{ a.reason }}</small>
                </div>
              </ng-template>
              <div class="vl-card-row">
                <ng-container *ngTemplateOutlet="act; context: { $implicit: action('draw') }" />
                <app-card-tile [card]="turn.card ?? null" />
              </div>
              <div class="vl-play">
                <div>
                  <div class="vl-dice" role="group" [attr.aria-label]="'table.dice' | t">
                    @for (value of diceShown(); track $index; let i = $index) {
                      <app-dice-tile
                        [value]="roll.faceFor(i, value)"
                        [rolling]="roll.isRolling(i)"
                        [selected]="shown().includes(i)"
                        [computerPick]="computerTurn() && shown().includes(i)"
                        [disabled]="!mine() || turn.phase !== 'select' || roll.rolling()"
                        (toggled)="toggle(i)"
                      />
                    }
                  </div>
                  @if (bust(); as b) {
                    <p class="vl-bust" role="status">{{ b.text }}</p>
                    <div class="vl-bust-timer" [style.animation-duration.ms]="BUST_MS"></div>
                  }
                  <p class="vl-roll-status" role="status">
                    @if (roll.rolling()) {
                      {{ 'dice.rolling' | t }}
                    }
                  </p>
                  <div class="vl-turn-actions">
                    <ng-container
                      *ngTemplateOutlet="act; context: { $implicit: action('throw') }"
                    />
                    <ng-container
                      *ngTemplateOutlet="act; context: { $implicit: action('select') }"
                    />
                  </div>
                </div>
                <div class="vl-safe" role="group" [attr.aria-label]="'table.safe' | t">
                  <strong
                    >{{ 'table.safe' | t }}: {{ bust() ? 0 : turn.carried + turn.run }}</strong
                  >
                  <div class="vl-aside">
                    @for (g of aside(); track $index) {
                      <span class="vl-aside-group">
                        <span class="vl-aside-dice">
                          @for (v of g.dice; track $index) {
                            <span
                              ><app-die-face [value]="v" /><span class="vl-sr-only">{{
                                v
                              }}</span></span
                            >
                          }
                        </span>
                        @if (g.points > 0) {
                          <small>+{{ g.points }}</small>
                        }
                      </span>
                    }
                  </div>
                  <ng-container *ngTemplateOutlet="act; context: { $implicit: action('bank') }" />
                  @if (belowMinimum()) {
                    <small>{{
                      'table.belowMinimum' | t: { min: state.rules.minimumPoints }
                    }}</small>
                  }
                </div>
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
                      <span class="vl-log-die"
                        ><app-die-face [value]="+part.text" /><span class="vl-sr-only">{{
                          part.text
                        }}</span></span
                      >
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
      <app-settings-dialog [(visible)]="settingsOpen" />
      <p-button [label]="'game.leave' | t" severity="secondary" (onClick)="socket.leave()" />
    }
  `,
})
export class Table {
  protected readonly socket = inject(SocketService);
  private readonly i18n = inject(I18nService);
  protected readonly chosen = signal<number[]>([]);
  /** My own ticks while I play, otherwise the active player's ticks pushed by the server. */
  protected readonly shown = computed(() =>
    this.mine() ? this.chosen() : (this.socket.game()?.preview ?? []),
  );
  private readonly messages = inject(MessageService);
  protected readonly roll = inject(DiceRollService);
  private readonly prefs = inject(DicePrefs);
  protected readonly settingsOpen = signal(false);
  protected readonly BUST_MS = BUST_MS;
  /** Bust notice: keeps the busting throw visible until the next player takes over. */
  protected readonly bust = signal<{ dice: readonly number[]; text: string } | null>(null);
  private readonly lastThrow = signal<readonly number[]>([]);
  /** Dice on the table: the busting throw, the rolling throw, else the latest throw. */
  protected readonly diceShown = computed((): readonly (number | null)[] => {
    const bust = this.bust();
    if (bust) return bust.dice;
    if (this.roll.rolling()) return this.lastThrow();
    const turn = this.socket.game()?.game?.turn;
    if (!turn) return [];
    // nothing on the table (e.g. after setting dice aside): placeholders for the free dice
    return turn.dice.length > 0 || turn.phase === 'draw'
      ? turn.dice
      : Array<null>(turn.free).fill(null);
  });
  /** Points are collected but still below the minimum needed to bank. */
  protected readonly belowMinimum = computed(() => {
    const g = this.socket.game()?.game;
    return !!g?.turn && g.turn.run > 0 && g.turn.run < g.rules.minimumPoints && this.canBank();
  });
  /** Dice set aside since the card was drawn, rebuilt from the revealed log. */
  protected readonly aside = computed(() => {
    const log = (this.socket.game()?.log ?? []).slice(0, this.revealed());
    const out: { dice: readonly number[]; points: number }[] = [];
    for (let i = log.length - 1; i >= 0; i--) {
      const e = log[i];
      const d = e.kind === 'turn' && typeof e.data === 'object' ? e.data : null;
      if (d?.type === 'selected') out.unshift({ dice: d.dice, points: d.points });
      else if (d && d.type !== 'thrown') break;
    }
    return out;
  });
  protected readonly action = (id: string) => this.actions().find((a) => a.id === id);
  /** Log entries already processed; the server log keeps growing, so the length is a stable cursor. */
  private seen = this.socket.game()?.log.length ?? 0;
  /** Entries shown: a throw's entry stays hidden until its dice have stopped (FR-010). */
  private readonly revealed = signal(this.seen);
  /** Newest entry on top, so nobody has to scroll to see what just happened. */
  protected readonly newestFirst = computed(() =>
    [...(this.socket.game()?.log ?? []).slice(0, this.revealed())].reverse(),
  );
  protected readonly seats = computed(() => {
    const g = this.socket.game();
    return g ? playerSeats(g) : [];
  });
  protected readonly computerTurn = computed(() => {
    const g = this.socket.game();
    return !!g?.game && g.seats[this.seats()[g.game.current]]?.state === 'computer';
  });
  /** It is my turn and the game is not paused. */
  protected readonly mine = computed(() => {
    const g = this.socket.game();
    if (!g?.game || g.pending.length > 0 || this.bust()) return false;
    return this.seats()[g.game.current] === g.you.seat;
  });

  protected readonly actions = computed(() => {
    const turn = this.socket.game()?.game?.turn;
    const mine = this.mine();
    const t = (key: string) => this.i18n.t(key);
    const wait = (ok: boolean, why: string) => {
      if (!mine) return t('table.notYourTurn');
      if (this.roll.rolling()) return '';
      return ok ? null : why; // null = enabled, '' = disabled without a visible reason
    };
    return [
      {
        id: 'draw',
        label: t('table.draw'),
        reason: wait(this.can('draw'), ''),
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
          this.can('select') ? t('table.selectOne') : '',
        ),
        run: () => this.select(),
      },
      {
        id: 'bank',
        label: t('table.bank'),
        reason: wait(this.canBank(), ''),
        run: () => this.act({ type: 'bank' }),
      },
    ];
  });

  constructor() {
    effect(() => {
      const g = this.socket.game();
      if (!g || this.roll.rolling() || this.bust()) return;
      // roll over: reveal what was held back, then continue with the rest
      this.revealed.set(this.seen);
      while (this.seen < g.log.length) {
        if (this.process(g, g.log[this.seen++])) return;
      }
      this.revealed.set(this.seen);
    });
  }

  /** Handle one new log entry; true = pause until the roll or bust notice is over. */
  private process(g: GameView, e: LogEntry): boolean {
    const data = e.kind === 'turn' && typeof e.data === 'object' ? e.data : null;
    if (data?.type === 'thrown') {
      this.startRoll(g, data.dice);
      if (this.roll.rolling()) return true;
    }
    const severity = ANNOUNCED[data ? data.type : e.kind];
    if (severity) this.messages.add({ severity, detail: logText(g, e, this.i18n), life: 4000 });
    return data?.type === 'bust' && this.showBust(g, e.seat);
  }

  /** Show the busting throw and who is next; returns false when there is nothing to show. */
  private showBust(g: GameView, seat: number | undefined): boolean {
    if (!g.game || this.lastThrow().length === 0) return false;
    const next = seatName(g.seats[this.seats()[g.game.current]], this.i18n);
    const you = seat === g.you.seat;
    const text = this.i18n.t(you ? 'table.bustYou' : 'table.bustOther', {
      who: seatName(g.seats[seat ?? -1], this.i18n),
      next,
    });
    this.bust.set({ dice: this.lastThrow(), text });
    setTimeout(() => this.bust.set(null), BUST_MS);
    return true;
  }

  private startRoll(g: GameView, dice: readonly number[]): void {
    this.lastThrow.set(dice);
    // ponytail: after a bust the current player is already the next one, so computerFast may be off
    const seat = g.game ? this.seats()[g.game.current] : undefined;
    this.roll.start(dice.length, {
      computerFast: g.seats[seat ?? -1]?.state === 'computer' && g.fastComputerDice,
      skip: this.prefs.skip(),
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
    const turn = this.socket.game()?.game?.turn;
    const min = this.socket.game()?.game?.rules.minimumPoints ?? 0;
    return (
      this.can('decide') &&
      card !== 'star' &&
      card !== 'street' &&
      !!turn &&
      turn.run > 0 &&
      turn.run >= min
    );
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
