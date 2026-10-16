import { Component, computed, inject, input, output } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { DieFace } from './die-face';

/** A die on the table: pip face inside a button. Selection is shown by lift, border and shadow, not colour alone. */
@Component({
  selector: 'app-dice-tile',
  imports: [DieFace],
  template: `
    <button
      type="button"
      class="vl-die"
      [class.vl-die-selected]="selected()"
      [attr.aria-pressed]="selected()"
      [attr.aria-label]="label()"
      [disabled]="disabled()"
      (click)="toggled.emit()"
    >
      <app-die-face [value]="value()" [rolling]="rolling()" />
      @if (computerPick()) {
        <i class="pi pi-desktop vl-pick-badge" aria-hidden="true"></i>
      }
    </button>
  `,
  styles: `
    .vl-die {
      /* padding around the face gives a hit area of at least 44px */
      min-width: 44px;
      min-height: 44px;
      padding: 0.25rem;
      font-size: 2rem;
      line-height: 0;
      border: 0;
      background: none;
      border-radius: 0.5rem;
      transition: transform 0.1s;
      cursor: pointer;
    }
    .vl-die {
      position: relative;
    }
    .vl-pick-badge {
      position: absolute;
      top: -0.5rem;
      right: -0.5rem;
      padding: 0.3rem;
      font-size: 1rem;
      line-height: 1;
      color: var(--p-primary-contrast-color);
      background: var(--p-primary-color);
      border-radius: 50%;
    }
    .vl-die:disabled {
      cursor: default;
    }
    .vl-die-selected {
      transform: translateY(-5px);
      filter: drop-shadow(0 4px 3px rgb(0 0 0 / 0.35));
      outline: 3px solid var(--p-primary-color);
    }
    .vl-die:focus-visible {
      outline: 3px solid var(--p-primary-color);
      outline-offset: 2px;
    }
    @media (prefers-reduced-motion: reduce) {
      .vl-die {
        transition: none;
      }
    }
  `,
})
export class DiceTile {
  /** `null` = not thrown yet (placeholder keeps the layout stable). */
  readonly value = input.required<number | null>();
  readonly selected = input(false);
  readonly disabled = input(false);
  readonly rolling = input(false);
  /** Selected by a computer player: adds a small badge. */
  readonly computerPick = input(false);
  readonly toggled = output();
  private readonly i18n = inject(I18nService);
  protected readonly label = computed(() => {
    const value = this.value();
    if (value === null) return this.i18n.t('dice.notThrown');
    const state = this.i18n.t(this.selected() ? 'dice.selected' : 'dice.notSelected');
    const text = this.i18n.t('dice.state', { value, state });
    return this.computerPick() ? `${text}, ${this.i18n.t('dice.computerPick')}` : text;
  });
}
