import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DiceRollService } from '../core/dice-roll';
import { TranslatePipe } from '../core/translate.pipe';
import { DiceTile } from '../shared/dice-tile';
import { DieFace } from '../shared/die-face';

/** [max dice, font size in rem] steps, smallest first. */
const ASIDE_SIZES = [
  [6, 2],
  [12, 1.6],
  [20, 1.25],
];

export interface TurnAction {
  id: string;
  label: string;
  reason: string | null;
  run: () => void;
}

export interface AsideGroup {
  dice: readonly number[];
  points: number;
}

const STREET_VALUES = [1, 2, 3, 4, 5, 6];

/** Dice, secured area and turn actions; presentational, `Table` owns the state. */
@Component({
  selector: 'app-dice-area',
  imports: [ButtonModule, DiceTile, DieFace, NgTemplateOutlet, TranslatePipe],
  template: `
    <ng-template #act let-a>
      @if (mine() && a.reason === null) {
        <div class="vl-action">
          <button
            pButton
            type="button"
            size="small"
            [disabled]="a.reason !== null"
            (click)="a.run()"
          >
            {{ a.label }}
          </button>
        </div>
      }
    </ng-template>
    <div class="vl-play">
      <div>
        <div class="vl-dice" role="group" [attr.aria-label]="'table.dice' | t">
          @for (value of dice(); track $index; let i = $index) {
            <app-dice-tile
              [value]="roll.faceFor(i, value)"
              [rolling]="roll.isRolling(i)"
              [selected]="selected().includes(i)"
              [computerPick]="computerPick() && selected().includes(i)"
              [disabled]="!canSelect() || roll.rolling()"
              (toggled)="toggled.emit(i)"
            />
          }
        </div>
        <div class="vl-turn-actions">
          <p class="vl-roll-status" role="status">
            @if (roll.rolling()) {
              {{ 'dice.rolling' | t }}
            }
          </p>
          <ng-container *ngTemplateOutlet="act; context: { $implicit: action('throw') }" />
          <ng-container *ngTemplateOutlet="act; context: { $implicit: action('select') }" />
          @if (notice(); as n) {
            <div class="vl-next" role="status">
              <p class="vl-bust">{{ n.text }}</p>
              <div class="vl-bust-timer" [style.animation-duration.ms]="noticeMs()"></div>
            </div>
          } @else if (next()) {
            <p class="vl-next" role="status">{{ next() }}</p>
          }
        </div>
      </div>
      <div class="vl-safe" role="group" [attr.aria-label]="'table.safe' | t">
        @if (street(); as picked) {
          @if (safeText()) {
            <strong>{{ safeText() }}</strong>
          }
          <div class="vl-aside vl-street">
            @for (v of streetValues; track v) {
              <span [class.vl-missing]="!picked.includes(v)"
                ><app-die-face [value]="v" /><span class="vl-sr-only">{{ v }}</span></span
              >
            }
          </div>
        } @else {
          @if (safeText()) {
            <strong>{{ safeText() }}</strong>
          }
          <div class="vl-aside" [style.font-size.rem]="asideSize()">
            @for (g of aside(); track $index) {
              <span class="vl-aside-group">
                <span class="vl-aside-dice">
                  @for (v of g.dice; track $index) {
                    <span
                      ><app-die-face [value]="v" /><span class="vl-sr-only">{{ v }}</span></span
                    >
                  }
                </span>
                @if (g.points > 0) {
                  <small>+{{ g.points }}</small>
                }
              </span>
            }
          </div>
        }
        @if (aside().length) {
          <ng-container *ngTemplateOutlet="act; context: { $implicit: action('bank') }" />
        }
        @if (minimum(); as min) {
          <small>{{ 'table.belowMinimum' | t: { min } }}</small>
        }
      </div>
    </div>
  `,
})
export class DiceArea {
  protected readonly roll = inject(DiceRollService);
  protected readonly streetValues = STREET_VALUES;
  readonly dice = input.required<readonly (number | null)[]>();
  readonly selected = input<readonly number[]>([]);
  /** Result of the last turn (bust or bank), shown with a countdown in place of the hint. */
  readonly notice = input<{ text: string } | null>(null);
  readonly noticeMs = input(0);
  readonly canSelect = input(false);
  /** Action buttons are only shown to the player on turn. */
  readonly mine = input(false);
  readonly computerPick = input(false);
  readonly actions = input.required<readonly TurnAction[]>();
  /** Values collected on a Street (null = not a Street). */
  readonly street = input<readonly number[] | null>(null);
  readonly aside = input<readonly AsideGroup[]>([]);
  /** Heading of the secured area: points, or progress towards the goal of the card. */
  readonly safeText = input('');
  /** Minimum to bank, set only while the collected points are still below it. */
  readonly minimum = input<number | null>(null);
  /** Hint for what happens next. */
  readonly next = input('');
  readonly toggled = output<number>();

  /** Shrinks the secured dice as they pile up so every group stays visible without scrolling. */
  protected readonly asideSize = computed(() => {
    const n = this.aside().reduce((sum, g) => sum + g.dice.length, 0);
    return (ASIDE_SIZES.find(([max]) => n <= max) ?? [0, 1])[1];
  });

  protected action(id: string): TurnAction | undefined {
    return this.actions().find((a) => a.id === id);
  }
}
