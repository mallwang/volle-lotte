import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import type { Action, Event as GameEvent, GameView, LogEntry } from 'game-rules';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { DicePrefs } from '../core/dice-prefs';
import { DiceRollService } from '../core/dice-roll';
import { errorMessage } from '../core/error-message';
import { logText, playerSeats, seatName } from '../core/game-view';
import { I18nService } from '../core/i18n.service';
import { SocketService } from '../core/socket.service';
import { TranslatePipe } from '../core/translate.pipe';
import { GameCard } from '../shared/game-card';
import { playedCards, seatRows, seatViews, totalCards } from '../core/table-view';
import { CardDeck } from './card-deck';
import { DiceArea } from './dice-area';
import { GameLog } from './game-log';
import { DiscardPile } from './discard-pile';
import { PlayerSeat } from './player-seat';
import { TableLayout } from './table-layout';
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
  timedOut: 'warn',
  replaced: 'warn',
  rejoined: 'info',
};

/** How long a turn's result (bust or bank) stays on the table before the next turn starts. */
const NOTICE_MS = 6000;

@Component({
  selector: 'app-table',
  imports: [
    ButtonModule,
    GameCard,
    CardDeck,
    DiscardPile,
    DiceArea,
    DialogModule,
    GameLog,
    MessageModule,
    PlayerSeat,
    TableLayout,
    SettingsDialog,
    TranslatePipe,
  ],
  template: `
    @if (socket.game(); as view) {
      <div class="vl-title-row">
        <h2>{{ view.name }}</h2>
        @if (view.game; as state) {
          <span class="vl-game-clock" role="timer">
            {{ 'table.round' | t: { round: round() } }} · {{ elapsed() }}
          </span>
          <span class="vl-game-clock">
            {{
              'table.rules'
                | t: { target: state.rules.targetScore, minimum: state.rules.minimumPoints }
            }}
          </span>
          <span class="vl-game-clock">
            {{ 'table.volleLottes' | t: { count: volleLottes() } }}
          </span>
        }
        <span class="vl-title-btns">
          <p-button
            icon="pi pi-sign-out"
            [rounded]="true"
            [text]="true"
            severity="secondary"
            [ariaLabel]="'game.leave' | t"
            [disabled]="removed()"
            (onClick)="leaveOpen.set(true)"
          />
          <p-button
            icon="pi pi-cog"
            [rounded]="true"
            [text]="true"
            severity="secondary"
            [ariaLabel]="'settings.open' | t"
            [disabled]="removed()"
            (onClick)="settingsOpen.set(true)"
          />
        </span>
      </div>
      @if (view.game; as state) {
        <div class="vl-table">
          <section [attr.aria-label]="'table.table' | t">
            <app-table-layout [label]="'table.players' | t" [style.--vl-rows]="rows()">
              @for (p of tableSeats(); track $index) {
                <li seat [class]="'vl-area-' + p.area">
                  <app-player-seat
                    [name]="p.name"
                    [score]="p.score"
                    [computer]="p.computer"
                    [online]="p.online"
                    [active]="p.active"
                    [action]="p.active && computerTurn() ? phaseLabel() : null"
                    [you]="p.you"
                    [deadlineAt]="p.active ? deadlineAt() : null"
                  />
                </li>
              }
              @if (state.turn; as turn) {
                <div class="vl-centre-row">
                  <app-card-deck [size]="state.deckSize" [total]="totalCards(state.rules)" />
                  <app-game-card [card]="activeCard()">
                    @if (mine() && actions()[0].reason === null) {
                      <button pButton type="button" size="small" (click)="actions()[0].run()">
                        {{ actions()[0].label }}
                      </button>
                    }
                  </app-game-card>
                  <app-discard-pile
                    [played]="playedCards(totalCards(state.rules), state.deckSize, !!activeCard())"
                    [previous]="previousCard()"
                  />
                </div>
                <app-dice-area
                  [dice]="diceShown()"
                  [selected]="shown()"
                  [notice]="notice()"
                  [noticeMs]="NOTICE_MS"
                  [canSelect]="mine() && turn.phase === 'select'"
                  [mine]="mine()"
                  [computerPick]="computerTurn()"
                  [actions]="actions()"
                  [next]="next()"
                  [street]="street()"
                  [aside]="aside()"
                  [safe]="notice() ? notice()!.safe : turn.carried + turn.run"
                  [minimum]="belowMinimum() ? state.rules.minimumPoints : null"
                  (toggled)="toggle($event)"
                />
              }
            </app-table-layout>
            @if (view.you.timeoutWarning) {
              <p-message severity="warn" role="alert">{{ 'turn.warning' | t }}</p-message>
            }
          </section>
          <section [attr.aria-label]="'table.log' | t">
            <p-button
              [label]="'table.log' | t"
              severity="secondary"
              size="small"
              [attr.aria-expanded]="logOpen()"
              (onClick)="logOpen.set(!logOpen())"
            />
            @if (logOpen()) {
              <app-game-log [entries]="newestFirst()" [parts]="parts" />
            }
          </section>
        </div>
      }
      <app-settings-dialog [(visible)]="settingsOpen" />
      <p-dialog
        [header]="'removed.title' | t"
        [style]="{ width: '28rem', maxWidth: '95vw' }"
        [visible]="removed()"
        [modal]="true"
        [closable]="false"
        [closeOnEscape]="false"
        [draggable]="false"
      >
        <p>{{ 'removed.body' | t }}</p>
        <div class="vl-actions">
          <p-button [label]="'removed.confirm' | t" (onClick)="socket.leave()" />
        </div>
      </p-dialog>
      <p-dialog
        [header]="'leave.title' | t"
        [style]="{ width: '28rem', maxWidth: '95vw' }"
        [(visible)]="leaveOpen"
        [modal]="true"
        [draggable]="false"
      >
        <p>{{ 'leave.body' | t }}</p>
        <div class="vl-actions">
          <p-button
            [label]="'leave.cancel' | t"
            severity="secondary"
            (onClick)="leaveOpen.set(false)"
          />
          <p-button [label]="'leave.confirm' | t" severity="danger" (onClick)="socket.leave()" />
        </div>
      </p-dialog>
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
  protected readonly leaveOpen = signal(false);
  protected readonly logOpen = signal(false);
  /** A computer took over my seat (timeouts); nothing here is playable anymore. */
  protected readonly removed = computed(() => (this.socket.game()?.you.seat ?? 0) < 0);
  protected readonly NOTICE_MS = NOTICE_MS;
  /** Result of a turn: keeps the last throw and secured dice visible until the next player takes over. */
  protected readonly notice = signal<{
    dice: readonly number[];
    text: string;
    safe: number;
  } | null>(null);
  private readonly lastThrow = signal<readonly number[]>([]);
  /** Dice on the table: the busting throw, the rolling throw, else the latest throw. */
  protected readonly diceShown = computed((): readonly (number | null)[] => {
    const notice = this.notice();
    if (notice) return notice.dice;
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
  /**
   * Values collected on a Street, from the revealed log (null = not a Street). The log keeps them
   * on the table while a bust is shown, when the turn state already belongs to the next player.
   */
  protected readonly street = computed((): number[] | null => {
    const log = (this.socket.game()?.log ?? []).slice(0, this.revealed());
    const picked: number[] = [];
    for (let i = log.length - 1; i >= 0; i--) {
      const e = log[i];
      const d = e.kind === 'turn' && typeof e.data === 'object' ? e.data : null;
      if (d?.type === 'selected') picked.push(...d.dice);
      else if (d?.type === 'cardDrawn') return d.card === 'street' ? picked : null;
      else if (d?.type !== 'thrown') return null;
    }
    return null;
  });
  /** Volle Lotte scored in this game, from the revealed log. */
  protected readonly volleLottes = computed(
    () =>
      (this.socket.game()?.log ?? [])
        .slice(0, this.revealed())
        .filter(
          (e) => e.kind === 'turn' && typeof e.data === 'object' && e.data.type === 'volleLotte',
        ).length,
  );
  /**
   * The card on the table. While dice roll, the state may already be past a bust, so the revealed
   * log decides: the card stays until its turn has ended and the dice have stopped.
   */
  protected readonly activeCard = computed(() => {
    const turnCard = this.socket.game()?.game?.turn?.card ?? null;
    if (!this.roll.rolling()) return turnCard;
    const log = (this.socket.game()?.log ?? []).slice(0, this.revealed());
    for (let i = log.length - 1; i >= 0; i--) {
      const e = log[i];
      const d = e.kind === 'turn' && typeof e.data === 'object' ? e.data : null;
      if (d?.type === 'cardDrawn') return d.card;
      if (d && ['bust', 'banked', 'turnLost', 'turnEnded'].includes(d.type)) return null;
    }
    return null;
  });
  /** The card played before the current one (the last one while no card is active). */
  protected readonly previousCard = computed(() => {
    const drawn = (this.socket.game()?.log ?? []).slice(0, this.revealed()).flatMap((e) => {
      const d = e.kind === 'turn' && typeof e.data === 'object' ? e.data : null;
      return d?.type === 'cardDrawn' ? [d.card] : [];
    });
    return drawn.at(this.activeCard() ? -2 : -1) ?? null;
  });
  protected readonly totalCards = totalCards;
  protected readonly playedCards = playedCards;
  protected readonly rows = computed(() => seatRows(this.tableSeats().length));
  protected readonly tableSeats = computed(() => {
    const g = this.socket.game();
    if (!g) return [];
    const views = seatViews(g);
    if (!this.roll.rolling()) return views;
    // while dice roll the state is already past the throw: keep the roller active until they stop
    const seat = (g.log ?? [])
      .slice(0, this.revealed())
      .filter((e) => e.kind === 'turn')
      .at(-1)?.seat;
    const roller = this.seats().indexOf(seat ?? -1);
    return roller < 0 ? views : views.map((v, i) => ({ ...v, active: i === roller }));
  });
  /** Turn timer of the active seat; hidden while dice roll or a bust is shown. */
  protected readonly deadlineAt = computed(() =>
    this.roll.rolling() || this.notice() ? null : (this.socket.game()?.turnDeadline?.at ?? null),
  );
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
  /** It is my turn. */
  protected readonly mine = computed(() => {
    const g = this.socket.game();
    if (!g?.game || this.notice() || this.removed()) return false;
    return this.seats()[g.game.current] === g.you.seat;
  });

  protected readonly actions = computed(() => {
    const turn = this.socket.game()?.game?.turn;
    const mine = this.mine();
    const t = (key: string) => this.i18n.t(key);
    const wait = (ok: boolean, why: string) => {
      if (!mine) return '';
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

  /** Phase of the current turn as a word ("Select", "Decide", ...), for the computer's seat. */
  protected readonly phaseLabel = computed(() => {
    const phase = this.socket.game()?.game?.turn?.phase;
    return phase ? this.i18n.t(`table.phase.${phase}`) : '';
  });

  /** Hint under the buttons: what the player on turn does next (for me only while a selection is missing). */
  protected readonly next = computed(() => {
    const turn = this.socket.game()?.game?.turn;
    if (!turn || this.notice() || this.roll.rolling()) return '';
    const t = this.i18n.t.bind(this.i18n);
    // my own buttons say what to do; only a pending selection needs a hint
    if (this.mine())
      return turn.phase === 'select' && this.shown().length === 0
        ? '👆 ' + t('table.selectOne')
        : '';
    let todo = [
      this.can('draw') && '🃏 ' + t('table.draw'),
      this.canThrow() && '🎲 ' + t('table.throw'),
      this.canBank() && '💰 ' + t('table.bank'),
    ]
      .filter(Boolean)
      .join(t('table.or'));
    if (turn.phase === 'select')
      todo = '👆 ' + t(this.shown().length > 0 ? 'table.select' : 'table.selectOne');
    return todo;
  });

  /** Completed turns, one per player and round (a bust or bank ends a turn). */
  protected readonly round = computed(() => {
    const g = this.socket.game();
    const turns = (g?.log ?? []).filter(
      (e) => e.kind === 'turn' && typeof e.data === 'object' && e.data.type === 'turnEnded',
    ).length;
    return Math.floor(turns / Math.max(1, g?.game?.players.length ?? 1)) + 1;
  });
  private readonly now = signal(Date.now());
  /** Time since the game started (frozen at the end), as m:ss or h:mm:ss. */
  protected readonly elapsed = computed(() => {
    const g = this.socket.game();
    const start = g?.log.find((e) => e.kind === 'started')?.at;
    if (!start) return '0:00';
    const end = g?.game?.result ? (g.log.at(-1)?.at ?? this.now()) : this.now();
    const s = Math.max(0, Math.floor((end - start) / 1000));
    const [h, m, sec] = [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60];
    const pad = (n: number) => String(n).padStart(2, '0');
    const mmss = `${m}:${pad(sec)}`;
    return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : mmss;
  });

  constructor() {
    const tick = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(tick));
    effect(() => {
      const g = this.socket.game();
      if (!g || this.roll.rolling() || this.notice()) return;
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
    const notice =
      (data?.type === 'bust' || data?.type === 'banked') && this.showNotice(g, e, data);
    const severity = ANNOUNCED[data ? data.type : e.kind];
    if (severity && !notice)
      this.messages.add({ severity, detail: logText(g, e, this.i18n), life: 4000 });
    return notice;
  }

  /** Show a bust or bank and who is next; returns false when there is nothing to show. */
  private showNotice(
    g: GameView,
    e: LogEntry,
    data: Extract<GameEvent, { type: 'bust' | 'banked' }>,
  ): boolean {
    const bust = data.type === 'bust';
    if (!g.game || g.game.result || (bust && this.lastThrow().length === 0)) return false;
    // Star cannot bust: its final throw is followed by a bank entry, which gets the notice
    const after = g.log[g.log.indexOf(e) + 1]?.data;
    if (bust && data.lost === 0 && typeof after === 'object' && after.type === 'banked')
      return false;
    const text = this.i18n.t(
      `table.${data.type === 'bust' ? 'bust' : 'banked'}${e.seat === g.you.seat ? 'You' : 'Other'}`,
      {
        who: seatName(g.seats[e.seat ?? -1], this.i18n),
        next: seatName(g.seats[this.seats()[g.game.current]], this.i18n),
        points: data.type === 'banked' ? data.points : 0,
      },
    );
    this.notice.set({
      dice: this.lastThrow(),
      text,
      safe: data.type === 'banked' ? data.points : 0,
    });
    setTimeout(() => this.notice.set(null), NOTICE_MS);
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
    const turn = this.socket.game()?.game?.turn;
    if (!turn || this.notice()) return false;
    // after a Volle Lotte on a Bonus card the next card may be drawn instead of banking
    if (phase === 'draw' && turn.phase === 'decide')
      return turn.free === 0 && turn.card?.startsWith('bonus') === true;
    return turn.phase === phase;
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
