import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import type { CardType } from 'game-rules';
import { DiceRollService } from '../core/dice-roll';
import { TranslatePipe } from '../core/translate.pipe';

/** Grid cells (0-8, row-major 3x3) that carry a pip, per die value. */
const PIPS: Record<number, readonly number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};
const CELLS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const WARN_SECONDS = 10;

/** Strip (rules, timer, Leave), card, turn points, dice and status line; `Table` owns the state. */
@Component({
  selector: 'app-table-board',
  imports: [TranslatePipe],
  template: `
    <div class="strip">
      <span class="rules">{{ rules() }}</span>
      @if (seconds() !== null) {
        <span class="secs" role="timer">{{ 'mobile.table.timer' | t: { s: seconds()! } }}</span>
      }
      <button type="button" class="leave" (click)="leave.emit()">{{ 'game.leave' | t }}</button>
    </div>
    @if (deadline(); as at) {
      @for (d of [at]; track d) {
        <div class="bar" aria-hidden="true" [style.animation-duration.ms]="left(d)"></div>
      }
    }
    <div class="cardrow">
      <div class="deck">{{ 'mobile.table.deck' | t: { n: deckSize() } }}</div>
      <div class="card" [class.empty]="!card()" [title]="cardInfo()">
        {{ card() ? ('card.' + card() | t) : ('mobile.table.noCard' | t) }}
      </div>
      <div class="points" role="status">
        {{ 'mobile.table.points' | t: { run: points() } }}
        @if (safe()) {
          <small>{{ safe() }}</small>
        }
      </div>
    </div>
    <div class="dice" role="group" [attr.aria-label]="'mobile.table.dice' | t">
      @for (value of dice(); track $index; let i = $index) {
        <button
          type="button"
          class="die"
          [class.sel]="selected().includes(i)"
          [class.roll]="roll.isRolling(i)"
          [attr.aria-pressed]="selected().includes(i)"
          [attr.aria-label]="roll.faceFor(i, value) ?? ('dice.notThrown' | t)"
          [disabled]="!canSelect() || roll.rolling()"
          (click)="toggled.emit(i)"
        >
          @for (c of cells; track c) {
            <span class="cell">
              @if (pips(roll.faceFor(i, value)).includes(c)) {
                <span class="pip"></span>
              }
            </span>
          }
        </button>
      }
    </div>
    <p class="status" role="status">{{ roll.rolling() ? ('dice.rolling' | t) : status() }}</p>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
    }
    .strip {
      display: flex;
      gap: 8px;
      align-items: center;
      font-size: 0.85rem;
    }
    .rules {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .secs {
      font-weight: 700;
    }
    .leave {
      min-height: 48px;
    }
    .bar {
      height: 4px;
      background: var(--vl-accent);
      transform-origin: left;
      animation: shrink linear forwards;
    }
    @keyframes shrink {
      to {
        transform: scaleX(0);
      }
    }
    .cardrow {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .deck,
    .card {
      padding: 6px 10px;
      border: 1px solid var(--vl-line);
      border-radius: 8px;
      background: var(--vl-surface);
    }
    .card {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      font-weight: 600;
      text-align: center;
      white-space: nowrap;
    }
    .card.empty {
      opacity: 0.5;
      font-weight: 400;
    }
    .points {
      display: flex;
      flex-direction: column;
      font-weight: 700;
    }
    .points small {
      font-weight: 400;
    }
    .dice {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
    }
    .die {
      display: grid;
      grid-template: repeat(3, 1fr) / repeat(3, 1fr);
      box-sizing: border-box;
      width: 52px;
      min-height: 52px;
      height: 52px;
      padding: 5px;
      touch-action: manipulation;
    }
    .die.sel {
      transform: translateY(-4px);
      border: 4px solid var(--vl-accent);
      padding: 2px;
    }
    .die.roll {
      animation: tumble 0.4s linear infinite;
    }
    @keyframes tumble {
      to {
        transform: rotate(360deg);
      }
    }
    .cell {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .pip {
      width: 80%;
      height: 80%;
      border-radius: 50%;
      background: var(--vl-ink);
    }
    .status {
      min-height: 1.4em;
      margin: 0;
      text-align: center;
    }
    @media (prefers-reduced-motion: reduce) {
      .die.roll {
        animation: none;
        opacity: 0.5;
      }
      .bar {
        animation: none;
      }
    }
  `,
})
export class TableBoard {
  protected readonly roll = inject(DiceRollService);
  protected readonly cells = CELLS;
  readonly rules = input('');
  /** Epoch ms of the server deadline; null = no timer. */
  readonly deadline = input<number | null>(null);
  readonly deckSize = input(0);
  readonly card = input<CardType | null>(null);
  readonly cardInfo = input('');
  readonly points = input(0);
  readonly safe = input('');
  readonly dice = input<readonly (number | null)[]>([]);
  readonly selected = input<readonly number[]>([]);
  readonly canSelect = input(false);
  readonly status = input('');
  readonly toggled = output<number>();
  readonly leave = output<void>();

  private readonly now = signal(Date.now());
  /** Whole seconds left, shown only in the last seconds. */
  protected readonly seconds = computed(() => {
    const at = this.deadline();
    if (at === null) return null;
    const s = Math.ceil((at - this.now()) / 1000);
    return s <= WARN_SECONDS ? Math.max(0, s) : null;
  });

  constructor() {
    // one clock, running only while a deadline exists
    effect((onCleanup) => {
      if (this.deadline() === null) return;
      this.now.set(Date.now());
      const id = setInterval(() => this.now.set(Date.now()), 250);
      onCleanup(() => clearInterval(id));
    });
  }

  protected pips = (v: number | null): readonly number[] => PIPS[v ?? 0] ?? [];
  protected left = (at: number): number => Math.max(0, at - Date.now());
}
