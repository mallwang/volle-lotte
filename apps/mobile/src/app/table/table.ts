import { Component, computed, effect, inject, OnDestroy, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { playerSeats, safeLabel, seatName } from 'client-core';
import {
  pacing,
  type CardType,
  type Event as GameEvent,
  type GameView,
  type LogEntry,
} from 'game-rules';
import { errorMessage } from '../core/error-message';
import { DiceRollService } from '../core/dice-roll';
import { MobileI18nService } from '../core/i18n.service';
import { MobileSocketService } from '../core/mobile-socket.service';
import { TranslatePipe } from '../core/translate.pipe';
import { GameOver } from './game-over';
import { LeaveDialog } from './leave-dialog';
import { TableActions, type TurnAction } from './table-actions';
import { TableBoard } from './table-board';
import { TablePlayers } from './table-players';

/** What the table keeps showing while the state is already past a finished turn. */
interface Notice {
  text: string;
  dice: readonly number[];
  /** Engine index of the player who ended the turn. */
  player: number;
  card: CardType | null;
}

const turnData = (e: LogEntry | undefined): GameEvent | null =>
  e?.kind === 'turn' && typeof e.data === 'object' ? e.data : null;
const logEnd = (g: GameView | null): number => (g ? g.logBase + g.log.length : 0);

/** The phone's game table: landscape only; the server decides, this reveals its log in order. */
@Component({
  selector: 'app-table',
  imports: [TranslatePipe, TablePlayers, TableBoard, TableActions, GameOver, LeaveDialog],
  template: `
    @if (view(); as g) {
      <app-table-players class="players" [view]="g" [activeIndex]="held()" />
      <app-table-board
        class="board"
        [rules]="rules()"
        [deadline]="deadline()"
        [deckSize]="g.game?.deckSize ?? 0"
        [card]="card()"
        [cardInfo]="cardInfo()"
        [points]="g.game?.turn?.run ?? 0"
        [safe]="safe()"
        [dice]="dice()"
        [selected]="shownSelection()"
        [canSelect]="mine() && can('select')"
        [status]="status()"
        (toggled)="toggle($event)"
        (leave)="leaveOpen.set(true)"
      />
      <app-table-actions
        class="actions"
        [actions]="actions()"
        [busy]="!mine() || socket.pending()"
        [reason]="reason()"
        (run)="run($event)"
      />
      @if (g.game?.result && !notice() && !roll.rolling()) {
        <app-game-over [view]="g" (leave)="leave()" />
      }
      @if (leaveOpen()) {
        <app-leave-dialog (confirm)="leave()" (back)="leaveOpen.set(false)" />
      }
    }
    <div class="rotate" role="alert">
      <p>{{ 'mobile.table.rotate' | t }}</p>
      <button type="button" (click)="leaveOpen.set(true)">{{ 'game.leave' | t }}</button>
    </div>
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: clamp(10rem, 28%, 13rem) minmax(0, 1fr) clamp(6.5rem, 20%, 8rem);
      gap: 8px;
      box-sizing: border-box;
      height: 100dvh;
      padding: max(8px, env(safe-area-inset-top)) max(8px, env(safe-area-inset-right))
        max(8px, env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-left));
      overflow: hidden;
      overscroll-behavior: none;
    }
    .players {
      overflow: hidden;
    }
    .rotate {
      display: none;
    }
    @media (orientation: portrait) {
      :host > :not(.rotate) {
        visibility: hidden;
      }
      .rotate {
        position: fixed;
        inset: 0;
        z-index: 10;
        display: flex;
        flex-direction: column;
        gap: 12px;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: var(--vl-bg);
        text-align: center;
      }
    }
  `,
})
export class Table implements OnDestroy {
  protected readonly socket = inject(MobileSocketService);
  protected readonly roll = inject(DiceRollService);
  private readonly i18n = inject(MobileI18nService);
  private readonly router = inject(Router);

  protected readonly view = this.socket.game;
  protected readonly leaveOpen = signal(false);
  protected readonly chosen = signal<number[]>([]);
  /** My own picks while I play, otherwise the active player's live preview. */
  protected readonly shownSelection = computed(() =>
    this.mine() ? this.chosen() : (this.view()?.preview ?? []),
  );
  protected readonly notice = signal<Notice | null>(null);
  /** The last revealed throw and the card/player of the turn that is being shown. */
  private readonly lastThrow = signal<readonly number[]>([]);
  private readonly heldCard = signal<CardType | null>(null);
  private readonly heldPlayer = signal<number | null>(null);
  private seen = logEnd(this.view());
  private noticeTimer?: ReturnType<typeof setTimeout>;

  private readonly seats = computed(() => {
    const g = this.view();
    return g ? playerSeats(g) : [];
  });
  private readonly turn = computed(() => this.view()?.game?.turn ?? null);
  private readonly onTurn = computed(() => {
    const g = this.view();
    return !!g?.game && g.you.seat >= 0 && this.seats()[g.game.current] === g.you.seat;
  });
  /** Mine to act on: it is my turn and nothing of the last one is still being shown. */
  protected readonly mine = computed(
    () => this.onTurn() && !this.notice() && !this.roll.rolling() && !this.view()?.paused,
  );
  private readonly replaying = computed(() => this.roll.rolling() || !!this.notice());

  /** While dice roll or a notice shows, the state is already past that turn. */
  protected readonly held = computed(() => (this.replaying() ? this.heldPlayer() : null));
  protected readonly card = computed(() =>
    this.replaying() ? this.heldCard() : (this.turn()?.card ?? null),
  );
  protected readonly cardInfo = computed(() => {
    const c = this.card()?.replace(/^bonus.*/, 'bonus');
    return c ? this.i18n.t(`card.info.${c}`) : '';
  });
  protected readonly dice = computed<readonly (number | null)[]>(() =>
    this.replaying() ? this.lastThrow() : (this.turn()?.dice ?? []),
  );
  protected readonly rules = computed(() => {
    const r = this.view()?.rules;
    return r ? this.i18n.t('table.rules', { target: r.targetScore, minimum: r.minimumPoints }) : '';
  });
  protected readonly deadline = computed(() =>
    this.replaying() || this.view()?.paused ? null : (this.view()?.turnDeadline?.at ?? null),
  );
  protected readonly safe = computed(() => {
    const turn = this.turn();
    if (!turn?.card || this.replaying()) return '';
    const { key, params } = safeLabel(turn);
    return this.i18n.t(key, params);
  });

  protected can(phase: string): boolean {
    const turn = this.turn();
    if (!turn) return false;
    // after a Volle Lotte on a Bonus card the next card may be drawn instead of banking
    if (phase === 'draw' && turn.phase === 'decide')
      return turn.free === 0 && turn.card?.startsWith('bonus') === true;
    return turn.phase === phase;
  }
  private canThrow(): boolean {
    return this.can('throw') || (this.can('decide') && (this.turn()?.free ?? 0) > 0);
  }
  /** Star, Street, Plus/Minus and Clover run to a bust or Volle Lotte: banking is never offered. */
  private canBank(): boolean {
    const turn = this.turn();
    const min = this.view()?.rules.minimumPoints ?? 0;
    const forced = ['star', 'doubleLotte', 'street', 'clover', 'plusMinus'];
    return (
      this.can('decide') &&
      !!turn &&
      !forced.includes(turn.card ?? '') &&
      turn.run > 0 &&
      turn.run >= min
    );
  }

  protected readonly actions = computed<TurnAction[]>(() => {
    const t = (k: string) => this.i18n.t(k);
    const mine = this.mine();
    const sel = this.can('select');
    return [
      { id: 'draw', label: t('table.draw'), enabled: mine && this.can('draw'), reason: '' },
      { id: 'throw', label: t('table.throw'), enabled: mine && this.canThrow(), reason: '' },
      {
        id: 'select',
        label: t('table.select'),
        enabled: mine && sel && this.chosen().length > 0,
        reason: '',
      },
      { id: 'bank', label: t('table.bank'), enabled: mine && this.canBank(), reason: '' },
    ];
  });
  /** Why the main button is off, when the player can do something about it. */
  protected readonly reason = computed(() => {
    const turn = this.turn();
    if (!turn || !this.mine()) return '';
    if (this.can('select') && this.chosen().length === 0) return this.i18n.t('table.selectOne');
    if (this.can('draw') && this.canBank()) return this.i18n.t('table.drawOrBank');
    if (this.can('decide') && turn.run > 0 && !this.canBank() && turn.run < this.minimum())
      return this.i18n.t('table.belowMinimum', { min: this.minimum() });
    return '';
  });
  private readonly minimum = computed(() => this.view()?.rules.minimumPoints ?? 0);

  /** One line under the dice: what just happened, a refusal, the pause, or who is playing. */
  protected readonly status = computed(() => {
    const g = this.view();
    if (!g?.game) return '';
    const shown = this.notice()?.text ?? this.socket.tableNotice();
    if (shown) return shown;
    if (g.paused) return this.i18n.t('table.paused');
    if (this.mine()) return '';
    const name = seatName(g.seats[this.seats()[g.game.current]]);
    return this.i18n.t('mobile.table.wait', { name });
  });

  constructor() {
    // leaving, a closed game or a lost seat all end with `game` null: back to the list
    effect(() => {
      if (!this.view()) untracked(() => void this.router.navigateByUrl('/'));
    });
    // the dice I picked belong to one throw: forget them with the turn state and tell the server
    effect(() => {
      const turn = this.turn();
      untracked(() => {
        if (turn?.phase !== 'select' && this.chosen().length) this.chosen.set([]);
      });
    });
    // reveal the server's log in order, pausing at every roll and notice
    effect(() => {
      const g = this.view();
      if (!g || this.roll.rolling() || this.notice()) return;
      untracked(() => {
        this.seen = Math.max(this.seen, g.logBase);
        while (this.seen < logEnd(g)) if (this.process(g, g.log[this.seen++ - g.logBase])) return;
      });
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this.noticeTimer);
  }

  protected toggle(i: number): void {
    if (!this.mine() || i >= (this.turn()?.dice.length ?? 0)) return;
    this.chosen.update((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]));
    this.socket.preview(this.chosen());
  }

  protected run(id: TurnAction['id']): void {
    const dice = [...this.chosen()].sort((a, b) => a - b);
    void this.socket.action(id === 'select' ? { type: 'select', dice } : { type: id });
  }

  protected async leave(): Promise<void> {
    this.leaveOpen.set(false);
    const ack = await this.socket.leave();
    if (!ack.ok) this.socket.tableNotice.set(errorMessage(ack, this.i18n));
  }

  /** Handle one new log entry; true = pause until the roll or notice is over. */
  private process(g: GameView, e: LogEntry): boolean {
    const data = turnData(e);
    const player = e.seat === undefined ? -1 : this.seats().indexOf(e.seat);
    if (player >= 0 && e.kind === 'turn') this.heldPlayer.set(player);
    if (data?.type === 'cardDrawn') this.heldCard.set(data.card);
    if (data?.type === 'thrown') {
      this.lastThrow.set(data.dice);
      const seat = g.game ? this.seats()[g.game.current] : undefined;
      this.roll.start(data.dice.length, {
        computerFast: g.seats[seat ?? -1]?.state === 'computer' && g.fastComputerDice,
      });
      return this.roll.rolling();
    }
    return this.announce(g, e, data, player);
  }

  /** The end of a turn (timeout, Stop, bust, bank) is held on the table for a while. */
  private announce(g: GameView, e: LogEntry, data: GameEvent | null, player: number): boolean {
    if (e.kind === 'timedOut') {
      const warn = e.seat === g.you.seat && g.you.timeoutWarning;
      return this.show(g, e, player, warn ? 'timedOutWarn' : 'timedOutYou', 'timedOutOther');
    }
    if (!g.game || g.game.result) return false;
    if (data?.type === 'cardDrawn' && data.card === 'stop')
      return this.show(g, e, player, 'stopYou', 'stopOther');
    if (data?.type === 'banked') return this.show(g, e, player, 'bankedYou', 'bankedOther', data);
    // a Star cannot bust: its final miss with nothing lost is followed by a bank entry
    const next = turnData(g.log[g.log.indexOf(e) + 1]);
    const starMiss = data?.type === 'bust' && data.lost === 0 && next?.type === 'banked';
    if (data?.type === 'bust' && this.lastThrow().length > 0 && !starMiss)
      return this.show(g, e, player, 'bustYou', 'bustOther');
    return false;
  }

  private show(
    g: GameView,
    e: LogEntry,
    player: number,
    you: string,
    other: string,
    banked?: Extract<GameEvent, { type: 'banked' }>,
  ): boolean {
    const text = this.i18n.t(`table.${e.seat === g.you.seat ? you : other}`, {
      who: seatName(g.seats[e.seat ?? -1]),
      next: seatName(g.seats[this.seats()[g.game?.current ?? -1]]),
      points: banked?.points ?? 0,
    });
    this.notice.set({ text, dice: this.lastThrow(), player, card: this.heldCard() });
    // the server waits as long before the next move, so the table holds the state that long
    this.noticeTimer = setTimeout(() => this.notice.set(null), pacing(g.computerSpeed).noticeMs);
    return true;
  }
}
