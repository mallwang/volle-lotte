import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import type { Action, CardType, Event as GameEvent, GameView, LogEntry } from 'game-rules';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { DicePrefs } from '../core/dice-prefs';
import { DiceRollService } from '../core/dice-roll';
import { errorMessage } from '../core/error-message';
import { logText, playerSeats, seatName } from '../core/game-view';
import { I18nService } from '../core/i18n.service';
import { SocketService } from '../core/socket.service';
import { TableScale } from '../core/table-scale';
import { TranslatePipe } from '../core/translate.pipe';
import { GameCard } from '../shared/game-card';
import { playedCards, safeLabel, seatRows, seatViews, totalCards } from '../core/table-view';
import { CardDeck } from './card-deck';
import { DiceArea } from './dice-area';
import { GameLog } from './game-log';
import { DiscardPile } from './discard-pile';
import { PlayerSeat } from './player-seat';
import { TableLayout } from './table-layout';
import { LeaveGame } from '../core/leave-game';
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
  replaced: 'warn',
  rejoined: 'info',
};

/**
 * How long a turn's result (bust, bank, Stop, timeout) stays on the table before the next turn
 * starts. The server waits as long (NOTICE_MS in game-room.ts) before the next player's move.
 */
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
    PlayerSeat,
    TableLayout,
    SettingsDialog,
    TooltipModule,
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
            (onClick)="leave.request()"
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
                  <div class="vl-card-slot" [pTooltip]="cardInfo()" tooltipPosition="top">
                    @for (n of [drawnCards().length]; track n) {
                      @if (activeCard()) {
                        <app-game-card [card]="activeCard()" class="vl-drawn" />
                      } @else {
                        <div class="vl-card-spot" aria-hidden="true"></div>
                      }
                    }
                    @if (mine() && actions()[0].reason === null) {
                      <button pButton type="button" size="small" (click)="actions()[0].run()">
                        {{ actions()[0].label }}
                      </button>
                    }
                    @if (activeCard(); as c) {
                      <span class="vl-card-name">{{ 'card.' + c | t }}</span>
                    }
                  </div>
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
                  [safeText]="safeText()"
                  [minimum]="belowMinimum() ? state.rules.minimumPoints : null"
                  (toggled)="toggle($event)"
                />
              }
            </app-table-layout>
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
  protected readonly leave = inject(LeaveGame);
  protected readonly logOpen = signal(false);
  /** A computer took over my seat (timeouts); nothing here is playable anymore. */
  protected readonly removed = computed(() => (this.socket.game()?.you.seat ?? 0) < 0);
  protected readonly NOTICE_MS = NOTICE_MS;
  /** Result of a turn: keeps the last throw and secured dice visible until the next player takes over. */
  protected readonly notice = signal<{
    dice: readonly number[];
    text: string;
    safe: number;
    /** Table seat that ended the turn; stays highlighted while the notice is shown. */
    seat: number;
    /** Card kept in the card slot until the notice is over (undefined = follow the turn state). */
    card?: CardType | null;
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
    // a Volle Lotte on a Bonus card keeps the collected dice for the bank-or-draw decision
    const keep = this.socket.game()?.game?.turn?.phase === 'decide';
    for (let i = log.length - 1; i >= 0; i--) {
      const e = log[i];
      const d = e.kind === 'turn' && typeof e.data === 'object' ? e.data : null;
      if (d?.type === 'selected') out.unshift({ dice: d.dice, points: d.points });
      else if (d && d.type !== 'thrown' && !(keep && d.type === 'volleLotte')) break;
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
   * The card on the table. While a notice is shown it keeps the card of the finished turn; while
   * dice roll, the state may already be past a bust, so the revealed log decides: the card stays
   * until its turn has ended and the dice have stopped.
   */
  protected readonly activeCard = computed(() => {
    const notice = this.notice();
    if (notice?.card !== undefined) return notice.card;
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
  /** Heading of the secured area; empty between turns, frozen while dice roll so it does not spoil the result. */
  protected readonly safeText = linkedSignal<{ text: string; rolling: boolean }, string>({
    source: () => {
      const turn = this.socket.game()?.game?.turn;
      const rolling = this.roll.rolling();
      if (!turn?.card || this.notice()) return { text: '', rolling };
      const { key, params } = safeLabel(turn);
      return { text: this.i18n.t(key, params), rolling };
    },
    computation: ({ text, rolling }, prev) => (rolling && prev ? prev.value : text),
  });
  /** Tooltip text for the card on the table: what it does and what to throw. */
  protected readonly cardInfo = computed(() => {
    const c = this.activeCard();
    if (!c) return '';
    const bonus = c.startsWith('bonus') ? c.slice(5) : null;
    return this.i18n.t('card.info.' + (bonus ? 'bonus' : c), {
      bonus: bonus ?? '',
      min: this.socket.game()?.game?.rules.minimumPoints ?? 0,
    });
  });

  /** The card played before the current one (the last one while no card is active). */
  protected readonly previousCard = computed(
    () => this.drawnCards().at(this.activeCard() ? -2 : -1) ?? null,
  );
  /** Cards drawn so far, from the revealed log; a new entry makes the card fly in from the deck. */
  protected readonly drawnCards = computed(() =>
    (this.socket.game()?.log ?? []).slice(0, this.revealed()).flatMap((e) => {
      const d = e.kind === 'turn' && typeof e.data === 'object' ? e.data : null;
      return d?.type === 'cardDrawn' ? [d.card] : [];
    }),
  );
  protected readonly totalCards = totalCards;
  protected readonly playedCards = playedCards;
  protected readonly rows = computed(() => seatRows(this.tableSeats().length));
  protected readonly tableSeats = computed(() => {
    const g = this.socket.game();
    if (!g) return [];
    const views = seatViews(g);
    const notice = this.notice();
    if (!this.roll.rolling() && !notice) return views;
    // while dice roll or a notice shows, the state is already past that turn: keep its player active
    const roller = notice
      ? notice.seat
      : this.seats().indexOf(
          (g.log ?? [])
            .slice(0, this.revealed())
            .filter((e) => e.kind === 'turn')
            .at(-1)?.seat ?? -1,
        );
    return roller < 0 ? views : views.map((v, i) => ({ ...v, active: i === roller }));
  });
  /** Turn timer of the active seat; hidden while dice roll or a notice is shown. */
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
    if (this.mine() && turn.card && this.can('draw') && this.canBank())
      return '🃏 ' + t('table.drawOrBank');
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
    const tableScale = inject(TableScale);
    tableScale.enable();
    inject(DestroyRef).onDestroy(() => {
      clearInterval(tick);
      tableScale.disable();
    });
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

  /** Handle one new log entry; true = pause until the roll or notice is over. */
  private process(g: GameView, e: LogEntry): boolean {
    const data = e.kind === 'turn' && typeof e.data === 'object' ? e.data : null;
    if (data?.type === 'thrown') {
      this.startRoll(g, data.dice);
      if (this.roll.rolling()) return true;
    }
    // a timeout is announced in the middle of the table, like a bust
    if (e.kind === 'timedOut') {
      const key = e.seat === g.you.seat && g.you.timeoutWarning ? 'timedOutWarn' : 'timedOutYou';
      return this.setNotice(g, e, key, 'timedOutOther', [], 0);
    }
    const notice =
      (data?.type === 'bust' || data?.type === 'banked' || data?.type === 'cardDrawn') &&
      this.showNotice(g, e, data);
    const severity = ANNOUNCED[data ? data.type : e.kind];
    // the loss of a Stop card is part of the Stop notice
    const afterStop = data?.type === 'turnLost' && this.isStop(g.log[g.log.indexOf(e) - 1]);
    if (severity && !notice && !afterStop)
      this.messages.add({ severity, detail: logText(g, e, this.i18n), life: 4000 });
    return notice;
  }

  /** Show a bust or bank and who is next; returns false when there is nothing to show. */
  private showNotice(
    g: GameView,
    e: LogEntry,
    data: Extract<GameEvent, { type: 'bust' | 'banked' | 'cardDrawn' }>,
  ): boolean {
    const i = g.log.indexOf(e);
    if (data.type === 'cardDrawn') {
      if (data.card !== 'stop' || !g.game || g.game.result) return false;
      const next = g.log[i + 1]?.data;
      const lost = typeof next === 'object' && next.type === 'turnLost' ? next.lost : 0;
      // the drawn Stop card belongs to the log from now on, so it shows on the discard pile
      const shown = this.setNotice(
        g,
        e,
        lost ? 'stopLostYou' : 'stopYou',
        lost ? 'stopLostOther' : 'stopOther',
        [],
        0,
        lost,
      );
      this.revealed.set(i + 1);
      return shown;
    }
    const bust = data.type === 'bust';
    if (!g.game || g.game.result || (bust && this.lastThrow().length === 0)) return false;
    // Star cannot bust: its final throw is followed by a bank entry, which gets the notice
    const after = g.log[i + 1]?.data;
    if (bust && data.lost === 0 && typeof after === 'object' && after.type === 'banked')
      return false;
    const points = data.type === 'banked' ? data.points : 0;
    return this.setNotice(
      g,
      e,
      `${data.type}You`,
      `${data.type}Other`,
      this.unselected(g, i, data.type),
      points,
    );
  }

  /** The last throw without the dice set aside from it before log index `i` (banking after a select). */
  private unselected(g: GameView, i: number, type: string): readonly number[] {
    const rest = [...this.lastThrow()];
    if (type !== 'banked') return rest;
    for (let j = i - 1; j >= 0; j--) {
      const d = g.log[j].kind === 'turn' ? g.log[j].data : null;
      if (!d || typeof d !== 'object' || d.type === 'thrown') break;
      if (d.type === 'selected') {
        for (const v of d.dice) rest.splice(rest.indexOf(v), 1);
        break;
      }
    }
    return rest;
  }

  private isStop(e: LogEntry | undefined): boolean {
    return (
      e?.kind === 'turn' &&
      typeof e.data === 'object' &&
      e.data.type === 'cardDrawn' &&
      e.data.card === 'stop'
    );
  }

  /** The card drawn last at or before log index `i` (the card of the turn that just ended). */
  private cardAt(g: GameView, i: number): CardType | null {
    for (let j = i; j >= 0; j--) {
      const d = g.log[j].kind === 'turn' ? g.log[j].data : null;
      if (d && typeof d === 'object' && d.type === 'cardDrawn') return d.card;
    }
    return null;
  }

  private setNotice(
    g: GameView,
    e: LogEntry,
    you: string,
    other: string,
    dice: readonly number[],
    points: number,
    lost = 0,
  ): boolean {
    const text = this.i18n.t(`table.${e.seat === g.you.seat ? you : other}`, {
      who: seatName(g.seats[e.seat ?? -1], this.i18n),
      next: seatName(g.seats[this.seats()[g.game?.current ?? -1]], this.i18n),
      points,
      lost,
    });
    // a timeout leaves the card as it is; every other notice keeps the finished turn's card
    const card = e.kind === 'timedOut' ? undefined : this.cardAt(g, g.log.indexOf(e));
    this.notice.set({ dice, text, safe: points, seat: this.seats().indexOf(e.seat ?? -1), card });
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

  /** Star, Street, Plus/Minus and Clover must run to a bust or Volle Lotte, so banking is never offered. */
  protected canBank(): boolean {
    const card = this.socket.game()?.game?.turn?.card;
    const turn = this.socket.game()?.game?.turn;
    const min = this.socket.game()?.game?.rules.minimumPoints ?? 0;
    return (
      this.can('decide') &&
      card !== 'star' &&
      card !== 'street' &&
      card !== 'clover' &&
      card !== 'plusMinus' &&
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
